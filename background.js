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
    const config = await chrome.storage.sync.get(['endPoint', 'houseId', 'housePwd']);
    
    if (!config.endPoint || !config.houseId) {
      console.error('用户配置不完整');
      return;
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
    } else {
      const error = await response.json();
      console.error('点歌请求失败:', error);
    }
    
  } catch (error) {
    console.error('发送点歌请求失败:', error);
  }
}
