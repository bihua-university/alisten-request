// DOM元素
const form = document.getElementById('configForm');
const endPointInput = document.getElementById('endPoint');
const houseIdInput = document.getElementById('houseId');
const housePwdInput = document.getElementById('housePwd');
const userNameInput = document.getElementById('userName');
const testBtn = document.getElementById('testBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadVersion();
});

// 加载版本信息
async function loadVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.querySelector('.version');
    if (versionElement && manifest.version) {
      versionElement.textContent = `v${manifest.version}`;
    }
  } catch (error) {
    console.error('加载版本信息失败:', error);
  }
}

// 加载保存的配置
async function loadConfig() {
  try {
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd', 'userName']);
    
    if (config.endPoint) endPointInput.value = config.endPoint;
    if (config.houseId) houseIdInput.value = config.houseId;
    if (config.housePwd) housePwdInput.value = config.housePwd;
    if (config.userName) userNameInput.value = config.userName;
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
      userName: userNameInput.value.trim()
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
      housePwd: housePwdInput.value.trim(),
      userName: userNameInput.value.trim()
    };
    
    if (!config.endPoint || !config.houseId) {
      showToast('请先填写完整配置', 'warning');
      return;
    }
    

    // 使用 /house/enter 接口来测试连接
    const response = await fetch(`https://${config.endPoint}/house/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: config.houseId,
        password: config.housePwd || ''
      })
    });
    
    if (response.ok) {
      // 连接成功且房间存在
      showToast('连接测试成功', 'success');
    } else if (response.status === 404) {
      // 房间不存在，但连接是通的
      showToast('连接成功，但房间不存在，请检查房间号', 'warning');
    } else if (response.status === 401) {
      // 密码错误，但连接是通的
      showToast('连接成功，但房间密码错误', 'warning');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.error('连接测试失败:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showToast('无法连接到服务器，请检查服务器地址', 'error');
    } else {
      showToast('连接测试失败: ' + error.message, 'error');
    }
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
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
  await saveConfig();
});

testBtn.addEventListener('click', testConnection);
