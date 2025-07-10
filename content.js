// 显示提示消息
function showToast(message, type = 'info') {
  // 移除之前的提示
  const existingToast = document.querySelector('.alisten-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `alisten-toast alisten-toast-${type}`;
  toast.textContent = message;
  
  // 插入到页面顶部
  document.body.appendChild(toast);
  
  // 动画显示
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // 3秒后自动消失
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// 全局配置变量
let globalConfig = {
  bilibiliEnabled: true,
  neteaseMusicEnabled: true
};

// 加载配置
async function loadConfig() {
  try {
    const config = await chrome.storage.sync.get([
      'bilibiliEnabled',
      'neteaseMusicEnabled'
    ]);
    
    globalConfig.bilibiliEnabled = config.bilibiliEnabled !== false;
    globalConfig.neteaseMusicEnabled = config.neteaseMusicEnabled !== false;
    
    console.log('配置加载完成:', globalConfig);
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

// 监听配置更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'configUpdated') {
    globalConfig.bilibiliEnabled = request.config.bilibiliEnabled;
    globalConfig.neteaseMusicEnabled = request.config.neteaseMusicEnabled;
    console.log('配置已更新:', globalConfig);
    
    // 重新初始化页面功能
    init();
  }
});

// 已处理的卡片集合
const processedCards = new Set();

// 通用的点歌请求处理函数
async function handleSongRequest(button, requestData, buttonType = 'default') {
  try {
    // 禁用按钮，防止重复点击
    if (buttonType === 'custom') {
      button.disabled = true;
      button.textContent = '⏳';
      button.classList.remove('success', 'error');
    } else {
      button.style.pointerEvents = 'none';
    }
    
    // 发送点歌请求到background script
    const response = await chrome.runtime.sendMessage({
      action: 'requestSong',
      ...requestData
    });
    
    if (response.success) {
      // 显示成功提示
      showToast('点歌成功！', 'success');
      
      // 更新按钮状态（仅对自定义按钮）
      if (buttonType === 'custom') {
        button.textContent = '✅';
        button.classList.add('success');
        button.setAttribute('title', response.message || '点歌成功！');
        
        setTimeout(() => {
          button.textContent = '🎶';
          button.classList.remove('success');
          button.setAttribute('title', '点歌');
          button.disabled = false;
        }, 2000);
      }
    } else {
      throw new Error(response.error || '发送失败');
    }
  } catch (error) {
    console.error('点歌请求失败:', error);
    
    // 显示失败提示
    showToast(error.message || '点歌失败，请重试', 'error');
    
    // 更新按钮状态（仅对自定义按钮）
    if (buttonType === 'custom') {
      button.textContent = '❌';
      button.classList.add('error');
      button.setAttribute('title', error.message || '点歌失败');
      
      setTimeout(() => {
        button.textContent = '🎶';
        button.classList.remove('error');
        button.setAttribute('title', '点歌');
        button.disabled = false;
      }, 2000);
    }
  } finally {
    // 恢复按钮状态（对所有按钮类型）
    if (buttonType !== 'custom') {
      button.style.pointerEvents = 'auto';
    }
  }
}

// 检测当前网站类型
function getCurrentSiteType() {
  const hostname = window.location.hostname;
  console.log('当前网站:', hostname);
  if (hostname.includes('bilibili.com')) {
    return 'bilibili';
  } else if (hostname.includes('music.163.com')) {
    return 'netease';
  }
  return 'unknown';
}

// 监听页面加载和动态内容变化
async function init() {
  // 先加载配置
  await loadConfig();
  
  const siteType = getCurrentSiteType();
  console.log('检测到网站类型:', siteType);
  
  // 检查对应网站功能是否启用
  if (siteType === 'bilibili' && !globalConfig.bilibiliEnabled) {
    console.log('B站功能已禁用，跳过处理');
    return;
  } else if (siteType === 'netease' && !globalConfig.neteaseMusicEnabled) {
    console.log('网易云音乐功能已禁用，跳过处理');
    return;
  }
  
  if (siteType === 'bilibili') {
    // 处理B站视频卡片
    processVideoCards();
    
    // 只为B站设置DOM监听，因为B站内容会动态加载
    const observer = new MutationObserver((mutations) => {
      // 检查功能是否仍然启用
      if (!globalConfig.bilibiliEnabled) {
        return;
      }
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查新增的节点是否包含视频卡片
              const cards = node.querySelectorAll ? node.querySelectorAll('.bili-video-card') : [];
              if (cards.length > 0) {
                processVideoCards();
              } else if (node.classList && node.classList.contains('bili-video-card')) {
                processVideoCard(node);
              }
            }
          });
        }
      });
    });
    
    // 开始观察文档变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else if (siteType === 'netease') {
    // 网易云音乐需要等待页面完全加载后再处理
    // 等待页面完全加载
    window.addEventListener('load', () => {
      setTimeout(() => {
        // 再次检查功能是否启用
        if (!globalConfig.neteaseMusicEnabled) {
          return;
        }
        
        // 检查当前URL是否为歌单页面
        const currentUrl = window.location.href;
        if (currentUrl.includes('/playlist')) {
          processSongPlaylist();
        } else if (currentUrl.includes('/song')) {
          processSongDetailPage();
        }
      }, 500);
    });
    
    // 也监听DOM变化，以处理动态加载的内容
    const observer = new MutationObserver((mutations) => {
      // 检查功能是否仍然启用
      if (!globalConfig.neteaseMusicEnabled) {
        return;
      }
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查新增的节点是否包含歌曲列表
              if (node.querySelectorAll && node.querySelectorAll('.m-table tbody tr').length > 0) {
                const currentUrl = window.location.href;
                if (currentUrl.includes('/playlist')) {
                  processSongPlaylist();
                } else if (currentUrl.includes('/song')) {
                  processSongDetailPage();
                }
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// 处理所有视频卡片
function processVideoCards() {
  const cards = document.querySelectorAll('.bili-video-card');
  cards.forEach(card => processVideoCard(card));
}

// 处理单个视频卡片
function processVideoCard(card) {
  // 避免重复处理
  const cardId = getCardId(card);
  if (processedCards.has(cardId)) {
    return;
  }
  
  // 提取BV号
  const bvId = extractBvId(card);
  if (!bvId) {
    return;
  }
  
  // 创建点歌按钮
  const songButton = createSongButton(bvId);
  
  // 找到合适的位置插入按钮
  const insertPosition = findInsertPosition(card);
  if (insertPosition) {
    insertPosition.appendChild(songButton);
    processedCards.add(cardId);
  }
}

// 处理网易云音乐歌曲列表
function processSongPlaylist() {
  // 检查是否在iframe中，主页面不需要处理，因为歌曲列表在iframe中
  if (window === window.parent) {
    return;
  }

  console.log('处理网易云音乐歌曲列表');
  const songRows = document.querySelectorAll('table.m-table tbody tr');
  console.log('找到', songRows.length, '首歌曲');
  songRows.forEach(row => processSongPlaylistRow(row));
}

// 处理单个歌曲行
function processSongPlaylistRow(row) {
  // 避免重复处理
  const rowId = getSongRowId(row);
  if (processedCards.has(rowId)) {
    return;
  }

  // 查找分享按钮
  shareButton = row.querySelector('.icn-share');
  if (!shareButton) {
    console.log('未找到分享按钮，跳过此行');
    return;
  }
  
  // 提取歌曲ID
  const songId = extractSongId(row);
  if (!songId) {
    return;
  }
  
  // 替换分享按钮为点歌按钮
  const success = replaceShareButtonWithSongButton(shareButton, songId);
  if (success) {
    processedCards.add(rowId);
  }
}

// 处理网易云音乐歌曲详情页面
function processSongDetailPage() {
  console.log('处理网易云音乐歌曲详情页面');
  // 查找分享按钮
  const shareButton = document.querySelector('#content-operation > a.u-btni.u-btni-share');
  if (!shareButton) {
    console.log('未找到分享按钮');
    return;
  }
  
  // 提取歌曲ID
  const songId = shareButton.getAttribute('data-res-id');
  if (!songId) {
    console.log('未找到歌曲ID');
    return;
  }
  
  console.log('找到歌曲详情页面，歌曲ID:', songId);
  
  // 避免重复处理
  const detailPageId = `detail-${songId}`;
  if (processedCards.has(detailPageId)) {
    return;
  }
  
  // 替换分享按钮为点歌按钮
  const success = replaceShareButtonWithSongButton(shareButton, songId);
  if (success) {
    processedCards.add(detailPageId);
  }
}

// 获取卡片唯一标识
function getCardId(card) {
  const link = card.querySelector('a[href*="/video/"]');
  return link ? link.href : Math.random().toString(36);
}

// 获取歌曲行唯一标识
function getSongRowId(row) {
  const songLink = row.querySelector('a[href*="/song?id="]');
  return songLink ? songLink.href : row.id || Math.random().toString(36);
}

// 提取BV号
function extractBvId(card) {
  const link = card.querySelector('a[href*="/video/"]');
  if (!link) return null;
  
  const href = link.getAttribute('href');
  const match = href.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// 提取网易云音乐歌曲ID
function extractSongId(row) {
  const songLink = row.querySelector('a[href*="/song?id="]');
  if (!songLink) return null;
  
  const href = songLink.getAttribute('href');
  const match = href.match(/\/song\?id=(\d+)/);
  return match ? match[1] : null;
}

// 创建点歌按钮
function createSongButton(bvId) {
  const button = document.createElement('button');
  button.className = 'song-request-btn';
  button.textContent = '🎶';
  button.setAttribute('data-bv-id', bvId);
  button.setAttribute('title', '点歌');
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 发送点歌请求到background script
    await handleSongRequest(button, {
      name: bvId,
      source: 'db'
    }, 'custom');
  });
  
  return button;
}

// 找到插入按钮的位置
function findInsertPosition(card) {
  // 直接插入到卡片本身，使用绝对定位
  return card;
}

// 替换网易云音乐分享按钮为点歌按钮（通用函数）
function replaceShareButtonWithSongButton(shareButton, songId) {
  // 修改按钮内容和属性
  const iconElement = shareButton.querySelector('i');
  if (iconElement) {
    iconElement.textContent = '点歌';
  } else {
    shareButton.textContent = '点歌';
  }
  
  shareButton.setAttribute('title', '点歌');
  
  // 添加点击事件
  shareButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 发送点歌请求到background script
    await handleSongRequest(shareButton, {
      id: songId,
      source: 'wy'
    });
  });
  
  return true;
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
