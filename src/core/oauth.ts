/**
 * iFlow OAuth 认证实现
 */

import http from 'http';
import crypto from 'crypto';
import { exec } from 'child_process';
import { IFLOW_OAUTH_CONFIG } from './iflow.js';

export interface IFlowAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  apiKey?: string;
  userId?: string;
  username?: string;
  email?: string;
  phone?: string;
}

/**
 * 获取可用端口
 */
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port'));
      }
    });
    server.on('error', reject);
  });
}

/**
 * 启动 iFlow OAuth 登录流程
 */
export async function startIFlowOAuthLogin(): Promise<IFlowAuthResult> {
  // 1. 获取可用端口
  const port = await getAvailablePort();
  const redirectUri = `http://127.0.0.1:${port}${IFLOW_OAUTH_CONFIG.callbackPath}`;

  // 2. 生成 state 参数
  const state = crypto.randomBytes(32).toString('hex');

  // 3. 构建授权 URL
  const authUrl = new URL(IFLOW_OAUTH_CONFIG.authorizationUrl);
  authUrl.searchParams.set('loginMethod', 'phone');
  authUrl.searchParams.set('type', 'phone');
  authUrl.searchParams.set('redirect', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('client_id', IFLOW_OAUTH_CONFIG.clientId);

  // 4. 启动本地 HTTP 服务器
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith(IFLOW_OAUTH_CONFIG.callbackPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      // 验证 state
      if (returnedState !== state) {
        res.writeHead(400);
        res.end('Invalid state');
        server.close();
        reject(new Error('Invalid state - possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end('No code received');
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      // 返回成功页面
      res.writeHead(302, { Location: IFLOW_OAUTH_CONFIG.successUrl });
      res.end();

      try {
        // 5. 交换 Token
        const tokenResult = await exchangeCodeForToken(code, redirectUri);

        // 6. 获取用户信息
        const userInfo = await fetchUserInfo(tokenResult.accessToken);

        // 7. 关闭服务器并返回结果
        server.close();
        resolve({
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          expiresAt: tokenResult.expiresAt,
          apiKey: userInfo.apiKey,
          userId: userInfo.userId,
          username: userInfo.username,
          email: userInfo.email,
          phone: userInfo.phone,
        });
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      // 打开浏览器
      console.log(`请在浏览器中完成登录: ${authUrl.toString()}`);
      openBrowser(authUrl.toString());
    });

    // 超时处理
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout'));
    }, 5 * 60 * 1000); // 5 分钟超时
  });
}

/**
 * 使用授权码交换 Token
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }> {
  const response = await fetch(IFLOW_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${IFLOW_OAUTH_CONFIG.clientId}:${IFLOW_OAUTH_CONFIG.clientSecret}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: IFLOW_OAUTH_CONFIG.clientId,
      client_secret: IFLOW_OAUTH_CONFIG.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

/**
 * 获取用户信息
 */
async function fetchUserInfo(
  accessToken: string
): Promise<{
  apiKey?: string;
  userId?: string;
  username?: string;
  email?: string;
  phone?: string;
}> {
  const userInfoUrl = new URL(IFLOW_OAUTH_CONFIG.userInfoUrl);
  userInfoUrl.searchParams.set('accessToken', accessToken);

  // 带重试机制
  let lastError: Error | null = null;
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(userInfoUrl.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean;
        data?: {
          apiKey?: string;
          userId?: string;
          userName?: string;
          email?: string;
          phone?: string;
        };
      };

      if (data.success && data.data) {
        return {
          apiKey: data.data.apiKey,
          userId: data.data.userId,
          username: data.data.userName,
          email: data.data.email,
          phone: data.data.phone,
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      lastError = error as Error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw lastError || new Error('Failed to fetch user info');
}

/**
 * 打开浏览器
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    // Linux 和 Android (Termux)
    command = `xdg-open "${url}" 2>/dev/null || termux-open-url "${url}" 2>/dev/null || echo "Please open: ${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`请手动打开浏览器访问: ${url}`);
    }
  });
}

/**
 * 刷新 Token
 */
export async function refreshIFlowToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }> {
  const response = await fetch(IFLOW_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: IFLOW_OAUTH_CONFIG.clientId,
      client_secret: IFLOW_OAUTH_CONFIG.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}
