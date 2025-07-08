// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'requestSong') {
    handleSongRequest(request.bvId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // 保持消息通道开放用于异步响应
  }
  return true;
});

// 处理点歌请求
async function handleSongRequest(bvId) {
  try {
    // 获取用户配置
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd']);
    
    if (!config.endPoint || !config.houseId) {
      throw new Error('用户配置不完整，请在插件设置中配置服务器地址和房间ID');
    }
    
    // 发送POST请求进行点歌
    const response = await fetch(`https://${config.endPoint}/music/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        houseId: config.houseId,
        password: config.housePwd || '',
        name: bvId,
        source: 'db' // 对于B站视频，使用 'db' 作为source
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('点歌请求成功:', result);
      
      // 更新最后点歌时间
      await chrome.storage.local.set({
        lastSongRequestTime: new Date().toISOString()
      });
      
      // 通知popup更新状态
      chrome.runtime.sendMessage({action: 'statusUpdate'}).catch(() => {
        // 忽略错误，popup可能没有打开
      });
      
      return {success: true, message: '点歌成功！', data: result};
    } else {
      const error = await response.json();
      console.error('点歌请求失败:', error);
      throw new Error(error.message || `服务器错误 (${response.status})`);
    }
    
  } catch (error) {
    console.error('发送点歌请求失败:', error);
    throw error;
  }
}
