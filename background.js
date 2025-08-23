// =====================
// 工具函数
// =====================
function normalizeEndPoint(endPoint) {
  // 如果没有协议前缀，默认添加 https://
  if (!endPoint.startsWith("http://") && !endPoint.startsWith("https://")) {
    return `https://${endPoint}`;
  }
  return endPoint;
}

// =====================
// 消息监听与主流程
// =====================
// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "requestSong") {
    handleSongRequest({
      id: request.id,
      name: request.name,
      source: request.source,
    })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放用于异步响应
  }
  return true;
});

// =====================
// 点歌相关
// =====================
// 处理点歌请求
async function handleSongRequest({ id, name, source }) {
  try {
    const config = await getUserConfig();
    if (!config.endPoint || !config.houseId) {
      throw new Error("用户配置不完整，请在插件设置中配置服务器地址和房间ID");
    }
    let requestBody = buildSongRequestBody(config, { id, name, source });
    const normalizedEndPoint = normalizeEndPoint(config.endPoint);
    const response = await fetch(`${normalizedEndPoint}/music/pick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (response.ok) {
      const result = await response.json();
      console.log("点歌请求成功:", result);
      return { success: true, message: "点歌成功！", data: result };
    } else {
      const error = await response.json();
      throw new Error(error.message || `服务器错误 (${response.status})`);
    }
  } catch (error) {
    throw error;
  }
}

// 构建点歌请求体
function buildSongRequestBody(config, { id, name, source }) {
  return {
    houseId: config.houseId,
    password: config.housePwd || "",
    user: {
      name: config.userName || "点歌插件",
      email: config.userEmail || "",
    },
    id: id || "",
    name: name || "",
    source: source || "db",
  };
}

// =====================
// 配置相关
// =====================
// 获取用户配置
async function getUserConfig() {
  return await chrome.storage.sync.get([
    "endPoint",
    "houseId",
    "housePwd",
    "userName",
    "userEmail",
  ]);
}
