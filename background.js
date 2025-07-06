// 全局WebSocket连接管理
let wsConnection = null;
let lastSongRequestTime = 0;
let wsCloseTimer = null;
let wsConnectionReady = false; // 标记连接是否已完成初始化


// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'requestSong') {
    handleSongRequest(request.bvId);
    sendResponse({success: true});
  }
  return true;
});

// 处理点歌请求
async function handleSongRequest(bvId) {
  try {
    // 获取用户配置
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd', 'nickName']);
    
    if (!config.endPoint || !config.houseId || !config.nickName) {
      console.error('用户配置不完整');
      return;
    }
    
    // 确保WebSocket连接存在
    await ensureWebSocketConnection(config);
    
    // 发送点歌消息
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN && wsConnectionReady) {
      const now = Date.now();
      const message = {
        action: "/music/pick",
        data: {
          name: bvId,
          source: "wy"
        },
        timestamp: now
      };
      
      wsConnection.send(JSON.stringify(message));
      lastSongRequestTime = now;
      
      // 重置关闭定时器
      resetCloseTimer();
      
      console.log('点歌请求已发送:', bvId);
    } else {
      console.error('WebSocket连接未就绪');
    }
  } catch (error) {
    console.error('发送点歌请求失败:', error);
  }
}

// 确保WebSocket连接存在
async function ensureWebSocketConnection(config) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN && wsConnectionReady) {
    return;
  }
  
  return new Promise((resolve, reject) => {
    try {
      const wsUrl = `wss://${config.endPoint}/server?houseId=${config.houseId}&housePwd=${config.housePwd || ''}`;
      wsConnection = new WebSocket(wsUrl);
      wsConnectionReady = false;
      
      wsConnection.onopen = async () => {
        console.log('WebSocket连接已建立，发送初始化消息');
        
        // 发送预先请求
        const initMessage = {
          action: "/setting/name",
          data: {
            name: config.nickName,
            sendTime: Date.now()
          },
          timestamp: Date.now()
        };
        
        try {
          wsConnection.send(JSON.stringify(initMessage));
          console.log('初始化消息已发送');
          
          // 等待服务器响应或者短暂延迟后认为连接就绪
          setTimeout(() => {
            wsConnectionReady = true;
            resetCloseTimer();
            resolve();
          }, 1000);
          
        } catch (error) {
          console.error('发送初始化消息失败:', error);
          wsConnection.close();
          reject(error);
        }
      };
      
      wsConnection.onclose = () => {
        console.log('WebSocket连接已关闭');
        wsConnection = null;
        wsConnectionReady = false;
        clearTimeout(wsCloseTimer);
      };
      
      wsConnection.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        wsConnection = null;
        wsConnectionReady = false;
        reject(error);
      };
      
      wsConnection.onmessage = (event) => {
        console.log('收到WebSocket消息:', event.data);
        
        // 如果收到响应，可以在这里进一步处理
        try {
          const response = JSON.parse(event.data);
          if (response.action === '/setting/name' && !wsConnectionReady) {
            wsConnectionReady = true;
            console.log('连接初始化完成');
          }
        } catch (e) {
          // 忽略解析错误
        }
      };
      
    } catch (error) {
      reject(error);
    }
  });
}

// 重置关闭定时器
function resetCloseTimer() {
  clearTimeout(wsCloseTimer);
  
  // 3分钟后关闭连接
  wsCloseTimer = setTimeout(() => {
    if (wsConnection && Date.now() - lastSongRequestTime > 180000) {
      wsConnection.close();
      wsConnection = null;
      console.log('WebSocket连接因超时而关闭');
    }
  }, 180000);
}

// 扩展卸载时清理资源
chrome.runtime.onSuspend.addListener(() => {
  if (wsConnection) {
    wsConnection.close();
  }
  clearTimeout(wsCloseTimer);
  wsConnectionReady = false;
});
