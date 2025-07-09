// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'requestSong') {
    handleSongRequest({id: request.id,name:request.name,source: request.source})
        .then(result => sendResponse(result))
        .catch(error => sendResponse({success: false, error: error.message}));
    return true; // 保持消息通道开放用于异步响应
  }
  return true;
});

// 处理点歌请求
async function handleSongRequest({id, name, source}) {
  try {
    // 获取用户配置
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd']);
    
    if (!config.endPoint || !config.houseId) {
      throw new Error('用户配置不完整，请在插件设置中配置服务器地址和房间ID');
    }
    
    // 根据来源设置不同的请求参数
    let requestBody = {
      houseId: config.houseId,
      password: config.housePwd || '',
      id: id || '',
      name: name || '',
      source: source || 'db',
    };
    
    // 发送POST请求进行点歌
    const response = await fetch(`https://${config.endPoint}/music/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('点歌请求成功:', result);
      
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
