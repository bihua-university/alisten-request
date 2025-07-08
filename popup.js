// DOM元素
const form = document.getElementById('configForm');
const endPointInput = document.getElementById('endPoint');
const houseIdInput = document.getElementById('houseId');
const housePwdInput = document.getElementById('housePwd');
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
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd']);
    
    if (config.endPoint) endPointInput.value = config.endPoint;
    if (config.houseId) houseIdInput.value = config.houseId;
    if (config.housePwd) housePwdInput.value = config.housePwd;
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
      housePwd: housePwdInput.value.trim()
    };
    
    // 验证必填字段
    if (!config.endPoint || !config.houseId) {
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
      housePwd: housePwdInput.value.trim()
    };
    
    if (!config.endPoint || !config.houseId) {
      showToast('请先填写完整配置', 'warning');
      return;
    }
    

    // FIXME: 没法用 music/pick 接口来测试，得想其他方法
    // 测试 HTTP POST 请求连接
    const response = await fetch(`https://${config.endPoint}/music/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        houseId: config.houseId,
        password: config.housePwd || '',
        name: 'TEST_CONNECTION',
        source: 'db'
      })
    });
    
    // 无论返回什么，只要能连接就算成功
    if (response.status === 404 || response.status === 401) {
      // 房间不存在或密码错误，但连接是通的
      const errorData = await response.json();
      if (errorData.error === '房间不存在') {
        showToast('连接成功，但房间不存在，请检查房间号', 'warning');
        await chrome.storage.local.set({ connectionStatus: 'warning', connectionMessage: '房间不存在' });
      } else if (errorData.error === '密码错误') {
        showToast('连接成功，但房间密码错误', 'warning');
        await chrome.storage.local.set({ connectionStatus: 'warning', connectionMessage: '密码错误' });
      } else {
        showToast('服务器连接正常', 'success');
        await chrome.storage.local.set({ connectionStatus: 'success', connectionMessage: '连接正常' });
      }
    } else if (response.ok) {
      showToast('连接测试成功', 'success');
      await chrome.storage.local.set({ connectionStatus: 'success', connectionMessage: '连接成功' });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.error('连接测试失败:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showToast('无法连接到服务器，请检查服务器地址', 'error');
      await chrome.storage.local.set({ connectionStatus: 'error', connectionMessage: '无法连接到服务器' });
    } else {
      showToast('连接测试失败: ' + error.message, 'error');
      await chrome.storage.local.set({ connectionStatus: 'error', connectionMessage: '连接失败' });
    }
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  }
}

// 更新状态显示
async function updateStatus() {
  try {
    // 获取存储的状态信息
    const status = await chrome.storage.local.get(['lastSongRequestTime', 'connectionStatus', 'connectionMessage']);
    
    // 显示连接状态
    if (status.connectionStatus) {
      switch (status.connectionStatus) {
        case 'success':
          connectionStatus.textContent = status.connectionMessage || '连接正常';
          connectionStatus.style.color = '#27ae60';
          break;
        case 'warning':
          connectionStatus.textContent = status.connectionMessage || '配置有误';
          connectionStatus.style.color = '#f39c12';
          break;
        case 'error':
          connectionStatus.textContent = status.connectionMessage || '连接失败';
          connectionStatus.style.color = '#e74c3c';
          break;
        default:
          connectionStatus.textContent = '未知状态';
          connectionStatus.style.color = '#95a5a6';
      }
    } else {
      // 如果没有保存的状态，显示未测试
      connectionStatus.textContent = '未测试';
      connectionStatus.style.color = '#95a5a6';
    }
    
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
