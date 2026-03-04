import cloudbase from '@cloudbase/js-sdk';

export type UploadResult = {
  /** 可直接用于 <img>/<video> 的访问 URL */
  url: string;
  /** CloudBase 返回的 fileID，后续如需管理文件可使用 */
  fileId: string;
};

// 从 Vite 注入的环境变量中读取配置
const envId: string | undefined =
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env?.VITE_CLOUDBASE_ENV_ID as string | undefined)
    : undefined;

const region: string =
  (typeof import.meta !== 'undefined'
    ? ((import.meta as any).env?.VITE_CLOUDBASE_REGION as string | undefined)
    : undefined) || 'ap-shanghai';

const accessKey: string | undefined =
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env?.VITE_CLOUDBASE_ACCESS_KEY as string | undefined)
    : undefined;

if (!envId) {
  // 在构建/运行时缺少必要配置时给出明确错误提示
  // eslint-disable-next-line no-console
  console.warn(
    '[cosClient] 缺少 VITE_CLOUDBASE_ENV_ID 配置，上传到 COS 将无法工作。请在 .env.local 中设置。'
  );
}

if (!accessKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[cosClient] 缺少 VITE_CLOUDBASE_ACCESS_KEY（publishable key），请在 CloudBase 控制台获取并配置到 .env.local。'
  );
}

const app =
  envId && accessKey
    ? cloudbase.init({
        env: envId,
        region,
        accessKey,
        auth: {
          detectSessionInUrl: true,
        },
      })
    : null;

// 简单的匿名登录，确保有会话后再上传文件
let authReadyPromise: Promise<void> | null = null;

async function ensureAuth() {
  if (!app) {
    throw new Error('CloudBase 未初始化，请检查 VITE_CLOUDBASE_ENV_ID / VITE_CLOUDBASE_ACCESS_KEY。');
  }

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      const auth: any = (app as any).auth;

      // 先看是否已有会话
      const { data: sessionData } = await auth.getSession().catch(() => ({ data: null }));
      if (sessionData?.session) {
        return;
      }

      // 使用匿名登录（需要在控制台开启「匿名登录」）
      const { error } = await auth.signInAnonymously();
      if (error) {
        throw new Error(`CloudBase 匿名登录失败：${error.message || String(error)}`);
      }
    })();
  }

  return authReadyPromise;
}

export async function uploadToCos(file: File): Promise<UploadResult> {
  if (!app) {
    throw new Error('CloudBase 未初始化，无法上传到 COS。');
  }

  await ensureAuth();

  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const safeExt = ext ? `.${ext}` : '';
  const cloudPath = `uploads/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${safeExt}`;

  const uploadRes = await (app as any).uploadFile({
    cloudPath,
    filePath: file,
  });

  const fileId: string = uploadRes.fileID;

  const tempUrlRes = await (app as any).getTempFileURL({
    fileList: [
      {
        fileID: fileId,
        maxAge: 24 * 60 * 60,
      },
    ],
  });

  const tempFile = tempUrlRes.fileList?.[0];
  const url: string = tempFile?.tempFileURL || fileId;

  return { url, fileId };
}

