// DOM元素
const form = document.getElementById('configForm');
const endPointInput = document.getElementById('endPoint');
const houseIdInput = document.getElementById('houseId');
const housePwdInput = document.getElementById('housePwd');
const nickNameInput = document.getElementById('nickName');
const testBtn = document.getElementById('testBtn');
const connectionStatus = document.getElementById('connectionStatus');
const lastSongTime = document.getElementById('lastSongTime');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await updateStatus();
});

// 加载保存的配置
async function loadConfig() {
  try {
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd', 'nickName']);
    
    if (config.endPoint) endPointInput.value = config.endPoint;
    if (config.houseId) houseIdInput.value = config.houseId;
    if (config.housePwd) housePwdInput.value = config.housePwd;
    if (config.nickName) nickNameInput.value = config.nickName;
  } catch (error) {
    console.error('加载配置失败:', error);
    showToast('加载配置失败', 'error');
  }
}

// 保存配置
async function saveConfig() {
  try {
    const config = {
      endPoint: endPointInput.value.trim(),
      houseId: houseIdInput.value.trim(),
      housePwd: housePwdInput.value.trim(),
      nickName: nickNameInput.value.trim()
    };
    
    // 验证必填字段
    if (!config.endPoint || !config.houseId || !config.nickName) {
      showToast('请填写所有必填字段', 'error');
      return false;
    }
    
    // 验证服务器地址格式
    if (!isValidEndPoint(config.endPoint)) {
      showToast('服务器地址格式不正确', 'error');
      return false;
    }
    
    await chrome.storage.sync.set(config);
    showToast('配置保存成功', 'success');
    return true;
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast('保存配置失败', 'error');
    return false;
  }
}

// 验证服务器地址格式
function isValidEndPoint(endPoint) {
  // 基本格式验证：域名:端口 或 域名
  const pattern = /^[a-zA-Z0-9.-]+(?:\:[0-9]+)?$/;
  return pattern.test(endPoint);
}

// 测试连接
async function testConnection() {
  try {
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    
    const config = {
      endPoint: endPointInput.value.trim(),
      houseId: houseIdInput.value.trim(),
      housePwd: housePwdInput.value.trim(),
      nickName: nickNameInput.value.trim()
    };
    
    if (!config.endPoint || !config.houseId || !config.nickName) {
      showToast('请先填写完整配置', 'warning');
      return;
    }
    
    // 构建WebSocket URL
    const wsUrl = `wss://${config.endPoint}/server?houseId=${config.houseId}&housePwd=${config.housePwd}`;
    
    // 创建临时WebSocket连接进行测试
    const testWs = new WebSocket(wsUrl);
    
    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        testWs.close();
        reject(new Error('连接超时'));
      }, 10000);
      
      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        resolve();
      };
      
      testWs.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
    
    await testPromise;
    showToast('连接测试成功', 'success');
    
  } catch (error) {
    console.error('连接测试失败:', error);
    showToast('连接测试失败: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  }
}

// 更新状态显示
async function updateStatus() {
  try {
    // 获取存储的状态信息
    const status = await chrome.storage.local.get(['wsConnected', 'lastSongRequestTime']);
    
    // 更新连接状态
    connectionStatus.textContent = status.wsConnected ? '已连接' : '未连接';
    connectionStatus.style.color = status.wsConnected ? '#27ae60' : '#e74c3c';
    
    // 更新最后点歌时间
    if (status.lastSongRequestTime) {
      const lastTime = new Date(status.lastSongRequestTime);
      lastSongTime.textContent = formatTime(lastTime);
    } else {
      lastSongTime.textContent = '无';
    }
  } catch (error) {
    console.error('更新状态失败:', error);
  }
}

// 格式化时间显示
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前';
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前';
  } else {
    return date.toLocaleString();
  }
}

// 显示提示消息
function showToast(message, type = 'info') {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 事件监听
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const success = await saveConfig();
  if (success) {
    await updateStatus();
  }
});

testBtn.addEventListener('click', testConnection);

// 定期更新状态
setInterval(updateStatus, 5000);

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'statusUpdate') {
    updateStatus();
  }
});
