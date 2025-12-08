import CryptoJS from 'crypto-js';
import { JimengConfig } from '../types';

const SERVICE = 'cv';
const REGION = 'cn-north-1';
const HOST = 'visual.volcengineapi.com';
const CONTENT_TYPE = 'application/json';

// --- Volcengine Signature Helper Functions ---

function getKDate(fullDate: string) {
  return fullDate.split('T')[0].replace(/-/g, '');
}

function hmac(key: string | CryptoJS.lib.WordArray, msg: string) {
  return CryptoJS.HmacSHA256(msg, key);
}

function getSigningKey(sk: string, date: string, region: string, service: string) {
  const kDate = hmac(sk, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'request');
  return kSigning;
}

// 核心修复：Payload 一致性 & Host Header 处理
function signRequest(
  config: JimengConfig,
  method: string,
  query: Record<string, string>,
  payloadStr: string, // Accept pre-stringified payload
  action: string,
  version: string
) {
  const dateObj = new Date();
  const xDate = dateObj.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = getKDate(xDate);
  
  // 1. Canonical Request
  const canonicalUri = '/';
  
  // Sort query params
  const queryParams = { ...query, Action: action, Version: version };
  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // SHA256 Hash of the payload string
  const payloadHash = CryptoJS.SHA256(payloadStr).toString(CryptoJS.enc.Hex);
  
  // IMPORTANT: Host IS included in calculation, but NOT in returned headers for fetch
  const signedHeaders = 'content-type;host;x-date';
  const canonicalHeaders = `content-type:${CONTENT_TYPE}\nhost:${HOST}\nx-date:${xDate}\n`;

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // 2. String to Sign
  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/request`;
  const stringToSign = [
    algorithm,
    xDate,
    credentialScope,
    CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex)
  ].join('\n');

  // 3. Signature
  const signingKey = getSigningKey(config.secretKey, shortDate, REGION, SERVICE);
  const signature = hmac(signingKey, stringToSign).toString(CryptoJS.enc.Hex);

  // 4. Authorization Header
  const authorization = `${algorithm} Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // NOTE: Do NOT include 'Host' here. Browser sets it automatically.
  return {
    headers: {
      'Authorization': authorization,
      'X-Date': xDate,
      'Content-Type': CONTENT_TYPE,
    },
    canonicalQueryString // Return this so we can use it in the URL
  };
}

// --- API Methods ---

const submitTask = async (config: JimengConfig, prompt: string) => {
  const action = 'CVSync2AsyncSubmitTask';
  const version = '2022-08-31';
  
  const body = {
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    width: 2048,
    height: 2048,
    // No image_urls
  };

  const payloadStr = JSON.stringify(body);
  const { headers, canonicalQueryString } = signRequest(config, 'POST', {}, payloadStr, action, version);
  
  // FIX: Use canonicalQueryString directly to ensure URL matches signature EXACTLY
  // Note: /api/jimeng is the local/Netlify proxy path
  const url = `/api/jimeng?${canonicalQueryString}`;

  try {
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: payloadStr
    });

    // Handle Proxy Errors (e.g., 404 Not Found, 502 Bad Gateway from Netlify)
    const contentType = response.headers.get("content-type");
    if (!response.ok || (contentType && contentType.includes("text/html"))) {
        const textError = await response.text();
        console.error(`Jimeng HTTP Error (${response.status}):`, textError);
        
        if (textError.includes("Page Not Found") || response.status === 404) {
           throw new Error("代理路径错误 (404)。请检查 Netlify 部署配置。");
        }
        
        // Try to extract a meaningful message if it's HTML
        const cleanMsg = textError.replace(/<[^>]*>?/gm, '').substring(0, 100);
        throw new Error(`网络请求失败 (${response.status}): ${cleanMsg}...`);
    }

    const result = await response.json();
    
    if (result.code !== 10000) {
        console.error("Jimeng Submit Error:", result);
        throw new Error(result.message || `API Error Code: ${result.code}`);
    }
    return result.data.task_id;
  } catch (e: any) {
    console.error("Submission Network/CORS Error:", e);
    throw new Error(`${e.message}`);
  }
};

const getTaskResult = async (config: JimengConfig, taskId: string) => {
  const action = 'CVSync2AsyncGetResult';
  const version = '2022-08-31';

  const body = {
    req_key: 'jimeng_t2i_v40',
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true })
  };

  const payloadStr = JSON.stringify(body);
  const { headers, canonicalQueryString } = signRequest(config, 'POST', {}, payloadStr, action, version);
  
  const url = `/api/jimeng?${canonicalQueryString}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: payloadStr
  });

  if (!response.ok) {
      const textError = await response.text();
      throw new Error(`Poll HTTP Error ${response.status}: ${textError.substring(0, 50)}`);
  }

  return await response.json();
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const generateJimengRender = async (
  config: JimengConfig,
  prompt: string
): Promise<string> => {
  try {
    // 1. Submit
    console.log("Submitting task to Jimeng (via proxy)...");
    const taskId = await submitTask(config, prompt);
    console.log("Jimeng Task Submitted ID:", taskId);

    // 2. Poll
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes approx
    
    while (attempts < maxAttempts) {
      await sleep(2000); // Poll every 2 seconds
      const res = await getTaskResult(config, taskId);
      
      console.log(`Polling attempt ${attempts + 1}:`, res.data?.status);

      if (res.data?.status === 'done') {
         if (res.data.image_urls && res.data.image_urls.length > 0) {
             return res.data.image_urls[0];
         }
         throw new Error("任务完成但未返回图片链接");
      } else if (res.data?.status === 'failed') {
         throw new Error("AI生成失败，任务状态: failed");
      } else if (res.data?.status === 'not_found' || res.data?.status === 'expired') {
          // Sometimes it takes a moment for the task to be visible
          if (attempts > 5) {
             throw new Error(`任务已失效或未找到: ${res.data?.status}`);
          }
      }
      
      attempts++;
    }
    
    throw new Error("生成超时，请稍后重试");

  } catch (error: any) {
    console.error("Jimeng API Error:", error);
    throw error;
  }
};