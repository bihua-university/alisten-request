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

// 已处理的视频卡片集合
const processedCards = new Set();

// 监听页面加载和动态内容变化
function init() {
  // 初始处理现有的视频卡片
  processVideoCards();
  
  // 监听DOM变化，处理动态加载的内容
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

// 获取卡片唯一标识
function getCardId(card) {
  const link = card.querySelector('a[href*="/video/"]');
  return link ? link.href : Math.random().toString(36);
}

// 提取BV号
function extractBvId(card) {
  const link = card.querySelector('a[href*="/video/"]');
  if (!link) return null;
  
  const href = link.getAttribute('href');
  const match = href.match(/\/video\/(BV[a-zA-Z0-9]+)/);
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
        bvId: bvId
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

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
