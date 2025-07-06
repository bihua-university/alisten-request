你要做一个点歌插件  

在域名包含`bilibili.com`的网站上, 找到所有`.bili-video-card`的元素, 在bili-video-card上增加一个"点歌"按钮, 点击之后, 从其中检索到BV号, 从请求发起点歌  

## `.bili-video-card`元素的html示例
```
<div   class="bili-video-card">
    <div  class="bili-video-card__skeleton hide">
        <div class="bili-video-card__skeleton--cover" ></div>
        <div class="bili-video-card__skeleton--info" >
            <div class="bili-video-card__skeleton--right" >
                <p class="bili-video-card__skeleton--text" ></p>
                <p class="bili-video-card__skeleton--text short" ></p>
                <p class="bili-video-card__skeleton--light" ></p>
            </div>
        </div>
    </div>
    <div  class="bili-video-card__wrap">
        <div  class="bili-video-card__no-interest" style="display: none;">
            <div  class="bili-video-card__no-interest--inner">
                <div  class="bili-video-card__no-interest--left"><svg 
                        xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 36 36" width="36" height="36" class="no-interest-icon" fill="currentColor">
                        <path
                            d=""></path>
                    </svg><span  class="no-interest-title">反馈成功</span><span 
                        class="no-interest-desc">平台将做相应处理</span></div>
                <div  class="bili-video-card__no-interest--right">
                    <div  class="revert-btn"><svg >
                        </svg> 撤销 </div>
                </div>
            </div>
        </div><a  href="//www.bilibili.com/video/BV1nBPye8ExN/" class="" target="_blank"
            data-mod="search-card" data-idx="all" data-ext="click">
            <div  class="bili-video-card__image">
                <div  class="bili-video-card__image--wrap">
                    <div class="bili-watch-later--wrap">
                        <div class="bili-watch-later bili-watch-later--pip" style="display: none;"><svg 
                                class="bili-watch-later__icon">
                            
                            </svg><span class="bili-watch-later__tip" style="display: none;">稍后再看</span></div>
                    </div>
                    <picture  class="v-img bili-video-card__cover">
                        <source
                            srcset=""
                            type="image/avif">
                        <source
                            srcset=""
                            type="image/webp"><img
                            src=""
                            alt="⚡可怜妹子来帮你洗脑辣⚡" loading="lazy" onload=""
                            onerror="typeof window.imgOnError === 'function' &amp;&amp; window.imgOnError(this)">
                    </picture>
                    <div class="v-inline-player"></div>
                </div>
                <div  class="bili-video-card__mask">
                    <div  class="bili-video-card__stats">
                        <div  class="bili-video-card__stats--left"><span 
                                class="bili-video-card__stats--item"><svg 
                                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                                    viewBox="0 0 24 24" width="24" height="24" fill="#ffffff"
                                    class="bili-video-card__stats--icon">
                                </svg><span >13万</span></span><span 
                                class="bili-video-card__stats--item"><svg class="bili-video-card__stats--icon">
                                    
                                </svg><span >149</span></span></div><span 
                            class="bili-video-card__stats__duration">01:09</span>
                    </div>
                </div>
            </div>
        </a>
        <div  class="bili-video-card__info"><!---->
            <div  class="bili-video-card__info--right"><a 
                    href="//www.bilibili.com/video/BV1nBPye8ExN/" target="_blank" data-mod="search-card" data-idx="all"
                    data-ext="click">
                    <h3  class="bili-video-card__info--tit" title="⚡可怜妹子来帮你洗脑辣⚡">⚡<em
                            class="keyword">可怜妹子</em>来帮你洗脑辣⚡</h3>
                </a><!---->
                <div  class="bili-video-card__info--bottom"><a 
                        class="bili-video-card__info--owner" href="//space.bilibili.com/2385744" target="_blank"
                        data-mod="search-card" data-idx="all" data-ext="click"><svg 
                            xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 24 24" width="24" height="24" class="bili-video-card__info--author-ico mr_2">
                            <path
                                fill="currentColor"></path>
                            <path
                                d=""
                                fill="currentColor"></path>
                            <path
                                d=""
                                fill="currentColor"></path>
                        </svg><span  class="bili-video-card__info--author">九条可怜</span><span
                             class="bili-video-card__info--date"> · 02-05</span></a></div>
            </div>
        </div>
    </div>
</div>
```

上面的例子中, `BV1nBPye8ExN`就是其BV号. 在html中的链接中能找到  

`.bili-video-card`元素可能是动态加载的, 请监听页面上的元素增加, 而非只在最开始识别一次  

## 用户配置
需要在插件的popup中, 允许用户进行一些配置:  
- endPoint
    包含服务器的域名和端口
- 房间号
- 房间密码 (可空)
- 用户昵称

这些配置应该是持久化的  

## 请求
请求是ws中的一个message. 你需要维护一个ws连接. 在background.js中维护, 使全局最多有一个ws连接. 并且如果一个ws连接在最近3分钟都没有发起点歌, 则将其关闭  

### url
wss://{userConfig.endPoint}/server?houseId={userConfig.houseId}&housePwd=${userConfig.housePwd}

### 预先请求
在对ws连接的管理中, 在ws连接上 发送任何消息之前 先发送这么一条消息, 发送成功才认为连接成功:
```
{"action":"/setting/name","data":{"name":"{userConfig.nickName}","sendTime":{当前时间(毫秒)}},"timestamp":{当前时间(毫秒)}}
```

### message
```
{"action":"/music/pick","data":{"name":"{bv号}","source":"wy"},"timestamp":{当前时间(毫秒)}}
```

## 技术栈
使用纯js, 不要使用ts  

## ui设计
使用了响应式设计, 适配不同尺寸的设备  
使用锐利, 不要有圆角, 扁平化, 淡色 亮色的ui  