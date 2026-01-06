// 欧乐影院 CatPawOpen 源
// 路径: nodejs/src/spider/video/olehdtv.js

import req from '../../util/req.js';
import { load } from 'cheerio';

const host = 'https://www.olehdtv.com';
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 封装请求函数
async function request(url, options = {}) {
    try {
        console.log('Requesting URL:', url);
        const res = await req(url, {
            method: options.method || 'get',
            headers: {
                "User-Agent": UA,
                "Referer": host + "/",
                "Accept-Language": "zh-CN,zh;q=0.9",
                ...options.headers
            },
            ...options
        });
        
        // 检查响应
        if (!res || !res.data) {
            console.error('No response data');
            return '';
        }
        
        console.log('Response received, length:', res.data.length);
        return res.data;
    } catch (error) {
        console.error('Request error:', error.message);
        return '';
    }
}

// 初始化
async function init(inReq, _outResp) {
    return {};
}

// 首页分类和筛选
async function home(inReq, _outResp) {
    const classes = [
        {type_id: "1", type_name: "电影"},
        {type_id: "2", type_name: "剧集"},
        {type_id: "3", type_name: "综艺"},
        {type_id: "4", type_name: "动漫"}
    ];
    
    const filters = generateFilters();
    
    return JSON.stringify({
        class: classes,
        filters: filters
    });
}

// 分类列表
async function category(inReq, _outResp) {
    try {
        const tid = inReq.body.id;
        const pg = inReq.body.page || 1;
        const extend = inReq.body.filters || {};
        
        const cateId = extend.cateId || tid;
        const area = extend.area || '';
        const by = extend.by || '/by/time';
        const lang = extend.lang || '';
        const letter = extend.letter || '';
        const year = extend.year || '';
        
        // 构建URL
        const url = `${host}/index.php/vod/show/id/${cateId}${area}${by}${lang}${letter}/page/${pg}${year}.html`;
        
        console.log('Category URL:', url); // 调试日志
        
        const headers = {
            "User-Agent": UA,
            "Referer": host + "/",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
        
        const html = await request(url, {method: 'get', headers: headers});
        
        if (!html) {
            console.error('No HTML content received');
            return JSON.stringify({
                page: parseInt(pg),
                pagecount: 1,
                list: []
            });
        }
        
        const list = extractVideos(html);
        console.log('Extracted videos count:', list.length); // 调试日志
        
        // 提取总页数
        const pageMatch = html.match(/>\s*(\d+)\s*<\/a>\s*<a[^>]*>尾页/);
        const pagecount = pageMatch ? parseInt(pageMatch[1]) : 999;
        
        return JSON.stringify({
            page: parseInt(pg),
            pagecount: pagecount,
            list: list
        });
    } catch (error) {
        console.error('Category error:', error);
        return JSON.stringify({
            page: 1,
            pagecount: 1,
            list: []
        });
    }
}

// 详情页
async function detail(inReq, _outResp) {
    const ids = Array.isArray(inReq.body.id) ? inReq.body.id : [inReq.body.id];
    const videos = [];
    
    for (const id of ids) {
        const url = `${host}/index.php/vod/detail/id/${id}.html`;
        const headers = {
            "User-Agent": UA,
            "Referer": host + "/",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
        
        const html = await request(url, {method: 'get', headers: headers});
        if (!html) continue;
        
        const $ = load(html);
        
        // 提取标题
        const title = $('.hd_tit').text().trim() || $('h2.title').text().trim() || '';
        
        // 提取图片
        let pic = $('.content_thumb .lazyload').attr('data-original') || '';
        if (pic.startsWith('//')) pic = 'https:' + pic;
        else if (pic.startsWith('/')) pic = host + pic;
        
        // 提取年份、地区、导演、演员
        let year = '', area = '', director = '', actor = '';
        $('.content_detail .data').each((i, elem) => {
            const text = $(elem).text();
            if (text.includes('年份：')) {
                year = $(elem).find('a').text().trim();
            } else if (text.includes('地区：')) {
                area = $(elem).find('a').text().trim();
            } else if (text.includes('导演：')) {
                const dirs = [];
                $(elem).find('a').each((j, a) => dirs.push($(a).text().trim()));
                director = dirs.join(' / ');
            } else if (text.includes('主演：')) {
                const acts = [];
                $(elem).find('a').each((j, a) => acts.push($(a).text().trim()));
                actor = acts.join(' / ');
            }
        });
        
        // 提取简介
        const content = $('.content_desc.context span').text().trim() || '暂无简介';
        
        // 提取播放源
        const playFromArr = [];
        const playUrlArr = [];
        
        const tabs = $('#NumTab a').toArray();
        const playlists = $('#playlistbox .content_playlist').toArray();
        
        tabs.forEach((tab, idx) => {
            const tabName = $(tab).text().replace(/\s+/g, ' ').trim();
            
            if (idx < playlists.length) {
                const episodes = [];
                $(playlists[idx]).find('li a').each((j, a) => {
                    const name = $(a).text().trim() || '播放';
                    const href = $(a).attr('href') || '';
                    
                    // 过滤包含 play_vip 的链接
                    if (href.includes('play_vip')) return;
                    
                    // 匹配格式: /play/id/78583/sid/1/nid/1.html
                    const match = href.match(/\/play\/id\/(\d+)\/sid\/(\d+)\/nid\/(\d+)/);
                    if (match) {
                        const [_, vid, sid, nid] = match;
                        episodes.push(`${name}$${vid}/${sid}/${nid}`);
                    }
                });
                
                if (episodes.length > 0) {
                    playFromArr.push(tabName);
                    playUrlArr.push(episodes.join('#'));
                }
            }
        });
        
        if (playFromArr.length > 0 && playUrlArr.length > 0) {
            videos.push({
                vod_id: id,
                vod_name: title,
                vod_pic: pic,
                vod_year: year,
                vod_area: area,
                vod_director: director,
                vod_actor: actor,
                vod_content: content,
                vod_play_from: playFromArr.join('$$$'),
                vod_play_url: playUrlArr.join('$$$')
            });
        }
    }
    
    return {list: videos};
}

// 搜索
async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    const url = `${host}/index.php/vod/search.html?wd=${encodeURIComponent(wd)}`;
    const headers = {
        "User-Agent": UA,
        "Referer": host + "/",
        "Accept-Language": "zh-CN,zh;q=0.9"
    };
    
    const html = await request(url, {method: 'get', headers: headers});
    const list = extractVideos(html);
    
    return {
        page: parseInt(pg),
        pagecount: 1,
        list: list
    };
}

// 播放
async function play(inReq, _outResp) {
    const id = inReq.body.id;
    
    // id 格式: 78583/1/1 (vid/sid/nid)
    const parts = id.split('/');
    const url = `${host}/index.php/vod/play/id/${parts[0]}/sid/${parts[1]}/nid/${parts[2]}.html`;
    
    const headers = {
        "User-Agent": UA,
        "Referer": host + "/",
        "Accept-Language": "zh-CN,zh;q=0.9"
    };
    
    const html = await request(url, {method: 'get', headers: headers});
    
    // 提取播放数据: var player_aaaa={"url":"...","encrypt":"..."}
    const match = html.match(/var\s+player_\w+\s*=\s*(\{[^}]+\})/);
    if (!match) {
        return {url: url, header: headers};
    }
    
    try {
        const playerData = JSON.parse(match[1]);
        let playUrl = playerData.url || '';
        
        // 处理加密
        if (playerData.encrypt === "1") {
            playUrl = decodeURIComponent(playUrl);
        } else if (playerData.encrypt === "2") {
            playUrl = decodeURIComponent(Buffer.from(playUrl, 'base64').toString());
        }
        
        // 检查是否是直链
        if (/\.m3u8|\.mp4/i.test(playUrl)) {
            return {
                parse: 0,
                url: playUrl,
                header: headers
            };
        }
    } catch (e) {
        console.log('Parse error:', e);
    }
    
    return {
        parse: 0,
        url: url,
        header: headers
    };
}

// 辅助函数：提取视频列表
function extractVideos(html) {
    if (!html) {
        console.log('extractVideos: No HTML provided');
        return [];
    }
    
    try {
        const $ = load(html);
        const videos = [];
        
        // 尝试多种选择器
        const vodItems = $('.vodlist li');
        console.log('Found vodlist items:', vodItems.length);
        
        if (vodItems.length === 0) {
            // 尝试其他可能的选择器
            const altItems = $('.vodlist_wi li, .module-item, .stui-vodlist li');
            console.log('Trying alternative selector, found:', altItems.length);
            
            altItems.each((i, elem) => {
                const $elem = $(elem);
                const $link = $elem.find('a').first();
                const href = $link.attr('href') || '';
                const id = href.match(/\/(\d+)\.html$/)?.[1];
                const name = $link.attr('title') || $link.text().trim() || '';
                const pic = $elem.find('img').attr('data-original') || 
                           $elem.find('img').attr('data-src') || 
                           $elem.find('img').attr('src') || '';
                const remarks = $elem.find('.pic_text, .module-item-note, .pic-text').text().trim() || '';
                
                if (id && name) {
                    videos.push({
                        vod_id: id,
                        vod_name: name.trim(),
                        vod_pic: pic.startsWith('//') ? 'https:' + pic : (pic.startsWith('/') ? host + pic : pic),
                        vod_remarks: remarks
                    });
                }
            });
        } else {
            vodItems.each((i, elem) => {
                const $elem = $(elem);
                const $link = $elem.find('a').first();
                const href = $link.attr('href') || '';
                const id = href.match(/\/(\d+)\.html$/)?.[1];
                const name = $link.attr('title') || '';
                const pic = $elem.find('.lazyload, img').attr('data-original') || 
                           $elem.find('.lazyload, img').attr('data-src') || 
                           $elem.find('img').attr('src') || '';
                const remarks = $elem.find('.pic_text').text().trim() || '';
                
                if (id && name) {
                    videos.push({
                        vod_id: id,
                        vod_name: name.trim(),
                        vod_pic: pic.startsWith('//') ? 'https:' + pic : (pic.startsWith('/') ? host + pic : pic),
                        vod_remarks: remarks
                    });
                }
            });
        }
        
        console.log('Extracted videos:', videos.length);
        return videos;
    } catch (error) {
        console.error('extractVideos error:', error);
        return [];
    }
}

// 生成筛选器
function generateFilters() {
    const years = [
        {n: "全部", v: ""},
        ...Array.from({length: 26}, (_, i) => {
            const y = 2025 - i;
            return {n: y + "", v: `/year/${y}`};
        })
    ];
    
    const areaList = [
        {n: "全部", v: ""}, {n: "大陆", v: "/area/大陆"}, {n: "香港", v: "/area/香港"},
        {n: "台湾", v: "/area/台湾"}, {n: "美国", v: "/area/美国"}, {n: "韩国", v: "/area/韩国"},
        {n: "日本", v: "/area/日本"}, {n: "英国", v: "/area/英国"}, {n: "法国", v: "/area/法国"},
        {n: "泰国", v: "/area/泰国"}, {n: "其它", v: "/area/其它"}
    ];
    
    const langList = [
        {n: "全部", v: ""}, {n: "国语", v: "/lang/国语"}, {n: "英语", v: "/lang/英语"},
        {n: "粤语", v: "/lang/粤语"}, {n: "韩语", v: "/lang/韩语"}, {n: "日语", v: "/lang/日语"},
        {n: "法语", v: "/lang/法语"}
    ];
    
    const letterList = [
        {n: "全部", v: ""},
        ...['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map(l => ({n: l, v: `/letter/${l}`})),
        {n: "0-9", v: "/letter/0-9"}
    ];
    
    const sortList = [
        {n: "按最新", v: "/by/time"}, {n: "按添加", v: "/by/time_add"},
        {n: "按最热", v: "/by/hits"}, {n: "按评分", v: "/by/score"}
    ];
    
    return {
        "1": [
            {key: "cateId", name: "分类", value: [
                {n: "全部", v: "1"}, {n: "动作片", v: "101"}, {n: "喜剧片", v: "102"},
                {n: "爱情片", v: "103"}, {n: "科幻片", v: "104"}, {n: "恐怖片", v: "105"},
                {n: "剧情片", v: "106"}, {n: "战争片", v: "107"}
            ]},
            {key: "area", name: "地区", value: areaList},
            {key: "year", name: "年份", value: years},
            {key: "lang", name: "语言", value: langList},
            {key: "letter", name: "字母", value: letterList},
            {key: "by", name: "排序", value: sortList}
        ],
        "2": [
            {key: "cateId", name: "分类", value: [
                {n: "全部", v: "2"}, {n: "国产剧", v: "202"}, {n: "欧美剧", v: "201"},
                {n: "港台剧", v: "203"}, {n: "日韩剧", v: "204"}
            ]},
            {key: "area", name: "地区", value: areaList},
            {key: "year", name: "年份", value: years},
            {key: "lang", name: "语言", value: langList},
            {key: "letter", name: "字母", value: letterList},
            {key: "by", name: "排序", value: sortList}
        ],
        "3": [
            {key: "cateId", name: "分类", value: [
                {n: "全部", v: "3"}, {n: "真人秀", v: "305"}, {n: "音乐", v: "302"},
                {n: "搞笑", v: "304"}, {n: "家庭", v: "301"}
            ]},
            {key: "area", name: "地区", value: areaList},
            {key: "year", name: "年份", value: years},
            {key: "lang", name: "语言", value: langList},
            {key: "letter", name: "字母", value: letterList},
            {key: "by", name: "排序", value: sortList}
        ],
        "4": [
            {key: "cateId", name: "分类", value: [
                {n: "全部", v: "4"}, {n: "日本", v: "401"}, 
                {n: "国产", v: "402"}, {n: "欧美", v: "403"}
            ]},
            {key: "area", name: "地区", value: areaList},
            {key: "year", name: "年份", value: years},
            {key: "lang", name: "语言", value: langList},
            {key: "letter", name: "字母", value: letterList},
            {key: "by", name: "排序", value: sortList}
        ]
    };
}

// 导出模块
export default {
    meta: {
        key: 'olehdtv',
        name: '欧乐影院',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
    }
};
