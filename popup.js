// =====================
// DOM 元素与全局变量
// =====================
const form = document.getElementById("configForm");
const endPointInput = document.getElementById("endPoint");
const houseIdInput = document.getElementById("houseId");
const housePwdInput = document.getElementById("housePwd");
const userNameInput = document.getElementById("userName");
const userEmailInput = document.getElementById("userEmail");
const bilibiliEnabledSwitch = document.getElementById("bilibiliEnabled");
const neteaseMusicEnabledSwitch = document.getElementById(
  "neteaseMusicEnabled"
);
const testBtn = document.getElementById("testBtn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

// =====================
// 页面初始化
// =====================
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await loadVersion();
});

// =====================
// 配置相关
// =====================
async function loadConfig() {
  try {
    const config = await chrome.storage.sync.get([
      "endPoint",
      "houseId",
      "housePwd",
      "userName",
      "userEmail",
      "bilibiliEnabled",
      "neteaseMusicEnabled",
    ]);

    if (config.endPoint) endPointInput.value = config.endPoint;
    if (config.houseId) houseIdInput.value = config.houseId;
    if (config.housePwd) housePwdInput.value = config.housePwd;
    if (config.userName) userNameInput.value = config.userName;
    if (config.userEmail) userEmailInput.value = config.userEmail;

    // 加载开关状态，默认为启用
    bilibiliEnabledSwitch.checked = config.bilibiliEnabled !== false;
    neteaseMusicEnabledSwitch.checked = config.neteaseMusicEnabled !== false;
  } catch (error) {
    console.error("加载配置失败:", error);
    showToast("加载配置失败", "error");
  }
}

async function saveConfig() {
  try {
    const config = {
      endPoint: endPointInput.value.trim(),
      houseId: houseIdInput.value.trim(),
      housePwd: housePwdInput.value.trim(),
      userName: userNameInput.value.trim(),
      userEmail: userEmailInput.value.trim(),
      bilibiliEnabled: bilibiliEnabledSwitch.checked,
      neteaseMusicEnabled: neteaseMusicEnabledSwitch.checked,
    };

    // 验证必填字段
    if (!config.endPoint || !config.houseId) {
      showToast("请填写所有必填字段", "error");
      return false;
    }

    // 验证服务器地址格式
    if (!isValidEndPoint(config.endPoint)) {
      showToast("服务器地址格式不正确", "error");
      return false;
    }

    await chrome.storage.sync.set(config);

    // 通知content script配置已更新
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        // 传递标准化后的配置给content script
        const normalizedConfig = {
          ...config,
          endPoint: normalizeEndPoint(config.endPoint),
        };
        chrome.tabs.sendMessage(tab.id, {
          action: "configUpdated",
          config: normalizedConfig,
        });
      }
    } catch (error) {
      // 如果无法发送消息到content script，忽略错误
      console.log("无法发送配置更新消息到content script:", error);
    }

    showToast("配置保存成功", "success");
    return true;
  } catch (error) {
    console.error("保存配置失败:", error);
    showToast("保存配置失败", "error");
    return false;
  }
}

function isValidEndPoint(endPoint) {
  // 支持 http/https 协议前缀或纯域名:端口格式
  const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?:\:[0-9]+)?$/;
  const domainPattern = /^[a-zA-Z0-9.-]+(?:\:[0-9]+)?$/;
  return urlPattern.test(endPoint) || domainPattern.test(endPoint);
}

function normalizeEndPoint(endPoint) {
  // 如果没有协议前缀，默认添加 https://
  if (!endPoint.startsWith("http://") && !endPoint.startsWith("https://")) {
    return `https://${endPoint}`;
  }
  return endPoint;
}

// =====================
// 版本信息
// =====================
async function loadVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.querySelector(".version");
    if (versionElement && manifest.version) {
      versionElement.textContent = `v${manifest.version}`;
    }
  } catch (error) {
    console.error("加载版本信息失败:", error);
  }
}

// =====================
// 连接测试
// =====================
async function testConnection() {
  try {
    testBtn.disabled = true;
    testBtn.textContent = "测试中...";

    const config = {
      endPoint: endPointInput.value.trim(),
      houseId: houseIdInput.value.trim(),
      housePwd: housePwdInput.value.trim(),
      userName: userNameInput.value.trim(),
      userEmail: userEmailInput.value.trim(),
    };

    if (!config.endPoint || !config.houseId) {
      showToast("请先填写完整配置", "warning");
      return;
    }

    // 使用 /house/enter 接口来测试连接
    const normalizedEndPoint = normalizeEndPoint(config.endPoint);
    const response = await fetch(`${normalizedEndPoint}/house/enter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: config.houseId,
        password: config.housePwd || "",
      }),
    });

    if (response.ok) {
      // 连接成功且房间存在
      showToast("连接测试成功", "success");
    } else if (response.status === 404) {
      // 房间不存在，但连接是通的
      showToast("连接成功，但房间不存在，请检查房间号", "warning");
    } else if (response.status === 401) {
      // 密码错误，但连接是通的
      showToast("连接成功，但房间密码错误", "warning");
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("连接测试失败:", error);
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      showToast("无法连接到服务器，请检查服务器地址", "error");
    } else {
      showToast("连接测试失败: " + error.message, "error");
    }
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "测试连接";
  }
}

// =====================
// UI 相关
// =====================
function showToast(message, type = "info") {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// =====================
// 事件监听
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveConfig();
});

testBtn.addEventListener("click", testConnection);

bilibiliEnabledSwitch.addEventListener("change", async () => {
  await saveConfig();
});

neteaseMusicEnabledSwitch.addEventListener("change", async () => {
  await saveConfig();
});
