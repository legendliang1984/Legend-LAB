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

function signRequest(
  config: JimengConfig,
  method: string,
  query: Record<string, string>,
  body: any,
  action: string,
  version: string
) {
  const dateObj = new Date();
  // Format: YYYYMMDDTHHMMSSZ
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

  const payload = JSON.stringify(body);
  const payloadHash = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
  
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

  return {
    Authorization: authorization,
    'X-Date': xDate,
    'Content-Type': CONTENT_TYPE,
    'Host': HOST
  };
}

// --- API Methods ---

const submitTask = async (config: JimengConfig, prompt: string, refImageUrl: string | null, scale: number = 0.5) => {
  const action = 'CVSync2AsyncSubmitTask';
  const version = '2022-08-31';
  
  const body: any = {
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    // If refImageUrl exists, this is Image-to-Image (or mixed), otherwise Text-to-Image
    image_urls: refImageUrl ? [refImageUrl] : [], 
    scale: scale, // Reference image weight
    force_single: true, // Save cost/time for preview
    // Request 2K resolution by default for high quality
    width: 2048,
    height: 2048
  };

  const headers = signRequest(config, 'POST', {}, body, action, version);
  const url = `https://${HOST}?Action=${action}&Version=${version}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (result.code !== 10000) {
    throw new Error(result.message || 'Task submission failed');
  }
  return result.data.task_id;
};

const getTaskResult = async (config: JimengConfig, taskId: string) => {
  const action = 'CVSync2AsyncGetResult';
  const version = '2022-08-31';

  const body = {
    req_key: 'jimeng_t2i_v40',
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true })
  };

  const headers = signRequest(config, 'POST', {}, body, action, version);
  const url = `https://${HOST}?Action=${action}&Version=${version}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  return await response.json();
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const generateJimengRender = async (
  config: JimengConfig,
  prompt: string,
  refImageUrl: string | null, // Must be a public http/https URL, cannot be base64
  scale: number
): Promise<string> => {
  try {
    // 1. Submit
    const taskId = await submitTask(config, prompt, refImageUrl, scale);
    console.log("Jimeng Task Submitted ID:", taskId);

    // 2. Poll
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes approx
    
    while (attempts < maxAttempts) {
      await sleep(2000); // Poll every 2 seconds
      const res = await getTaskResult(config, taskId);
      
      console.log("Polling status:", res.data?.status);

      if (res.data?.status === 'done') {
         if (res.data.image_urls && res.data.image_urls.length > 0) {
             return res.data.image_urls[0];
         }
         throw new Error("Task done but no images returned");
      } else if (res.data?.status === 'failed' || res.data?.status === 'not_found' || res.data?.status === 'expired') {
         throw new Error(`Generation failed: ${res.data?.status}`);
      }
      
      attempts++;
    }
    
    throw new Error("Generation timed out");

  } catch (error: any) {
    console.error("Jimeng API Error:", error);
    throw error;
  }
};