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

// 已处理的卡片集合
const processedCards = new Set();

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
function init() {
  const siteType = getCurrentSiteType();
  console.log('检测到网站类型:', siteType);
  
  if (siteType === 'bilibili') {
    // 处理B站视频卡片
    processVideoCards();
    
    // 只为B站设置DOM监听，因为B站内容会动态加载
    const observer = new MutationObserver((mutations) => {
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
    if (document.readyState === 'complete') {
      // 页面已完全加载，延迟处理以确保内容渲染完成
      setTimeout(() => processSongList(), 500);
    } else {
      // 等待页面完全加载
      window.addEventListener('load', () => {
        setTimeout(() => processSongList(), 500);
      });
    }
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
function processSongList(retryCount = 0) {
  console.log('处理网易云音乐歌曲列表，重试次数:', retryCount);
  // 检查是否在iframe中，主页面不需要处理，因为歌曲列表在iframe中
  if (window === window.parent) {
    return;
  }
  
  const songRows = document.querySelectorAll('table.m-table tbody tr');
  
  if (songRows.length === 0) {
    // 最多重试5次，避免无限循环
    if (retryCount < 5) {
      console.log('未找到歌曲列表，1秒后重试');
      setTimeout(() => processSongList(retryCount + 1), 1000);
    } else {
      console.log('重试次数已达上限，停止处理歌曲列表');
    }
    return;
  }
  
  console.log('找到', songRows.length, '首歌曲');
  songRows.forEach(row => processSongRow(row));
}

// 处理单个歌曲行
function processSongRow(row) {
  // 避免重复处理
  const rowId = getSongRowId(row);
  if (processedCards.has(rowId)) {
    return;
  }
  
  // 提取歌曲ID
  const songId = extractSongId(row);
  if (!songId) {
    return;
  }
  
  // 替换分享按钮为点歌按钮
  const success = replaceShareButtonWithSongButton(row, songId);
  if (success) {
    processedCards.add(rowId);
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
    try {
      button.disabled = true;
      button.textContent = '⏳';
      button.classList.remove('success', 'error');
      
      const response = await chrome.runtime.sendMessage({
        action: 'requestSong',
        name: bvId,
        source: 'db'
      });
      
      if (response.success) {
        button.textContent = '✅';
        button.classList.add('success');
        button.setAttribute('title', response.message || '点歌成功！');
        
        // 显示成功提示
        showToast('点歌成功！', 'success');
        
        setTimeout(() => {
          button.textContent = '🎶';
          button.classList.remove('success');
          button.setAttribute('title', '点歌');
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error || '发送失败');
      }
    } catch (error) {
      console.error('点歌请求失败:', error);
      button.textContent = '❌';
      button.classList.add('error');
      button.setAttribute('title', error.message || '点歌失败');
      
      // 显示失败提示
      showToast(error.message || '点歌失败，请重试', 'error');
      
      setTimeout(() => {
        button.textContent = '🎶';
        button.classList.remove('error');
        button.setAttribute('title', '点歌');
        button.disabled = false;
      }, 2000);
    }
  });
  
  return button;
}

// 找到插入按钮的位置
function findInsertPosition(card) {
  // 直接插入到卡片本身，使用绝对定位
  return card;
}

// 替换网易云音乐歌曲行中的分享按钮
function replaceShareButtonWithSongButton(row, songId) {
  // 找到分享按钮
  const shareButton = row.querySelector('.icn-share');
  if (!shareButton) {
    return false;
  }
  
  // 直接修改分享按钮，保持原有图标和样式
  shareButton.textContent = '点歌';
  shareButton.setAttribute('data-song-id', songId);
  shareButton.setAttribute('title', '点歌');
  shareButton.className = 'icn icn-share'; // 保持原有的CSS类名以保留图标
  
  // 移除原有的分享相关属性
  shareButton.removeAttribute('data-res-action');
  shareButton.removeAttribute('data-res-name');
  shareButton.removeAttribute('data-res-author');
  shareButton.removeAttribute('data-res-pic');
  
  // 添加点击事件
  shareButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 发送点歌请求到background script
    try {
      shareButton.style.pointerEvents = 'none';
      shareButton.textContent = '请求中...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'requestSong',
        id: songId,
        source: 'wy'
      });
      
      if (response.success) {
        shareButton.textContent = '成功';
        shareButton.style.color = '#00cc66';
        shareButton.setAttribute('title', response.message || '点歌成功！');
        
        // 显示成功提示
        showToast('点歌成功！', 'success');
        
        setTimeout(() => {
          shareButton.textContent = '点歌';
          shareButton.style.color = '';
          shareButton.setAttribute('title', '点歌');
          shareButton.style.pointerEvents = 'auto';
        }, 2000);
      } else {
        throw new Error(response.error || '发送失败');
      }
    } catch (error) {
      console.error('点歌请求失败:', error);
      shareButton.textContent = '失败';
      shareButton.style.color = '#ff4444';
      shareButton.setAttribute('title', error.message || '点歌失败');
      
      // 显示失败提示
      showToast(error.message || '点歌失败，请重试', 'error');
      
      setTimeout(() => {
        shareButton.textContent = '点歌';
        shareButton.style.color = '';
        shareButton.setAttribute('title', '点歌');
        shareButton.style.pointerEvents = 'auto';
      }, 2000);
    }
  });
  
  return true;
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
