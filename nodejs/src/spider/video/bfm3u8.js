/**
 * 暴风资源采集源
 * 基于 CatPawOpen 标准格式
 * API: https://bfzyapi.com/api.php/provide/vod/
 * 支持大小分类和筛选功能
 */

import * as HLS from 'hls-parser';
import req from '../../util/req.js';

let url = '';
let categories = [];

// 定义大分类
const parentCategories = {
    '电影片': ['动作片', '喜剧片', '恐怖片', '科幻片', '爱情片', '剧情片', '战争片', '纪录片', '动画片'],
    '连续剧': ['国产剧', '欧美剧', '香港剧', '韩国剧', '台湾剧', '日本剧', '海外剧', '泰国剧'],
    '动漫片': ['国产动漫', '日韩动漫', '欧美动漫'],
    '综艺片': ['大陆综艺', '港台综艺', '日韩综艺', '欧美综艺'],
    '短剧大全': ['重生民国', '穿越年代', '现代言情', '反转爽文']
};

// 独立分类(没有子分类)
const standaloneCategories = ['电影解说', '体育赛事'];

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

async function init(inReq, _outResp) {
    url = inReq.server.config.bfm3u8.url;
    categories = inReq.server.config.bfm3u8.categories || [];
    return {};
}

const testSiteLikes = [];

async function home(_inReq, _outResp) {
    const data = await request(url);
    let classes = [];
    
    // 获取所有分类的映射 (type_name -> type_id)
    const categoryMap = {};
    for (const cls of data.class) {
        const n = cls.type_name.toString().trim();
        categoryMap[n] = cls.type_id.toString();
    }
    
    // 如果配置了categories,按照配置的顺序和内容来组织
    if (categories && categories.length > 0) {
        for (const catName of categories) {
            if (categoryMap[catName]) {
                // 判断是否为大分类
                const isParent = Object.keys(parentCategories).includes(catName);
                const isStandalone = standaloneCategories.includes(catName);
                
                classes.push({
                    type_id: categoryMap[catName],
                    type_name: catName,
                    type_flag: isParent ? 'parent' : (isStandalone ? 'standalone' : 'child')
                });
            }
        }
    } else {
        // 如果没有配置,返回所有分类
        for (const cls of data.class) {
            const n = cls.type_name.toString().trim();
            const isParent = Object.keys(parentCategories).includes(n);
            const isStandalone = standaloneCategories.includes(n);
            
            classes.push({
                type_id: cls.type_id.toString(),
                type_name: n,
                type_flag: isParent ? 'parent' : (isStandalone ? 'standalone' : 'child')
            });
        }
    }
    
    // 获取推荐列表
    if (data.list) {
        const likes = await request(url + `?ac=detail&ids=${data.list.map((v) => v.vod_id).join(',')}`);
        for (const vod of likes.list) {
            testSiteLikes.push({
                vod_id: vod.vod_id.toString(),
                vod_name: vod.vod_name.toString(),
                vod_pic: vod.vod_pic,
                vod_remarks: vod.vod_remarks,
            });
        }
    }
    
    return {
        class: classes,
        filters: buildFilters(classes) // 添加筛选器
    };
}

// 构建筛选器
function buildFilters(classes) {
    const filters = {};
    
    for (const cls of classes) {
        // 只为子分类和独立分类创建筛选器,大分类不需要筛选器
        if (cls.type_flag !== 'parent') {
            filters[cls.type_id] = [
                {
                    key: 'class',
                    name: '类型',
                    value: [
                        { n: '全部', v: '' }
                    ]
                },
                {
                    key: 'area',
                    name: '地区',
                    value: [
                        { n: '全部', v: '' },
                        { n: '大陆', v: '大陆' },
                        { n: '香港', v: '香港' },
                        { n: '台湾', v: '台湾' },
                        { n: '美国', v: '美国' },
                        { n: '韩国', v: '韩国' },
                        { n: '日本', v: '日本' },
                        { n: '泰国', v: '泰国' },
                        { n: '英国', v: '英国' },
                        { n: '法国', v: '法国' },
                        { n: '其他', v: '其他' }
                    ]
                },
                {
                    key: 'year',
                    name: '年份',
                    value: [
                        { n: '全部', v: '' },
                        { n: '2024', v: '2024' },
                        { n: '2023', v: '2023' },
                        { n: '2022', v: '2022' },
                        { n: '2021', v: '2021' },
                        { n: '2020', v: '2020' },
                        { n: '2019', v: '2019' },
                        { n: '2018', v: '2018' },
                        { n: '2017', v: '2017' },
                        { n: '2016', v: '2016' },
                        { n: '2015', v: '2015' },
                        { n: '2010-2014', v: '2010' },
                        { n: '2000-2009', v: '2000' },
                        { n: '90年代', v: '1990' },
                        { n: '80年代', v: '1980' }
                    ]
                },
                {
                    key: 'lang',
                    name: '语言',
                    value: [
                        { n: '全部', v: '' },
                        { n: '国语', v: '国语' },
                        { n: '英语', v: '英语' },
                        { n: '粤语', v: '粤语' },
                        { n: '闽南语', v: '闽南语' },
                        { n: '韩语', v: '韩语' },
                        { n: '日语', v: '日语' },
                        { n: '其它', v: '其它' }
                    ]
                },
                {
                    key: 'by',
                    name: '排序',
                    value: [
                        { n: '最新', v: 'time' },
                        { n: '最热', v: 'hits' },
                        { n: '评分', v: 'score' }
                    ]
                }
            ];
        }
    }
    
    return filters;
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page;
    const filter = inReq.body.filters;
    
    let page = pg || 1;
    if (page == 0) page = 1;
    
    // 构建请求URL,添加筛选参数
    let reqUrl = url + `?ac=detail&t=${tid}&pg=${page}`;
    
    if (filter) {
        if (filter.area) reqUrl += `&area=${encodeURIComponent(filter.area)}`;
        if (filter.year) reqUrl += `&year=${filter.year}`;
        if (filter.lang) reqUrl += `&lang=${encodeURIComponent(filter.lang)}`;
        if (filter.by) reqUrl += `&by=${filter.by}`;
    }
    
    const data = await request(reqUrl);
    let videos = [];
    
    for (const vod of data.list) {
        videos.push({
            vod_id: vod.vod_id.toString(),
            vod_name: vod.vod_name.toString(),
            vod_pic: vod.vod_pic,
            vod_remarks: vod.vod_remarks,
        });
    }
    
    return {
        page: parseInt(data.page),
        pagecount: data.pagecount,
        total: data.total,
        list: videos,
    };
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    
    for (const id of ids) {
        const data = (await request(url + `?ac=detail&ids=${id}`)).list[0];
        let vod = {
            vod_id: data.vod_id,
            vod_name: data.vod_name,
            vod_pic: data.vod_pic,
            type_name: data.type_name,
            vod_year: data.vod_year,
            vod_area: data.vod_area,
            vod_remarks: data.vod_remarks,
            vod_actor: data.vod_actor,
            vod_director: data.vod_director,
            vod_content: data.vod_content.trim(),
            vod_play_from: data.vod_play_from,
            vod_play_url: data.vod_play_url,
        };
        vod.likes = testSiteLikes;
        videos.push(vod);
    }
    
    return {
        list: videos,
    };
}

async function proxy(inReq, outResp) {
    const what = inReq.params.what;
    const purl = decodeURIComponent(inReq.params.ids);
    
    if (what == 'hls') {
        const resp = await req(purl, {
            method: 'get',
        });
        const plist = HLS.parse(resp.data);
        
        if (plist.variants) {
            for (const v of plist.variants) {
                if (!v.uri.startsWith('http')) {
                    v.uri = new URL(v.uri, purl).toString();
                }
            }
            plist.variants.map((variant) => {
                variant.uri = inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(variant.uri) + '/.m3u8';
            });
        }
        
        if (plist.segments) {
            for (const s of plist.segments) {
                if (!s.uri.startsWith('http')) {
                    s.uri = new URL(s.uri, purl).toString();
                }
                if (s.key && s.key.uri && !s.key.uri.startsWith('http')) {
                    s.key.uri = new URL(s.key.uri, purl).toString();
                }
            }
            plist.segments.map((seg) => {
                seg.uri = inReq.server.prefix + '/proxy/ts/' + encodeURIComponent(seg.uri) + '/.ts';
            });
        }
        
        const hls = HLS.stringify(plist);
        let hlsHeaders = {};
        
        if (resp.headers['content-length']) {
            Object.assign(hlsHeaders, resp.headers, {
                'content-length': hls.length.toString(),
            });
        } else {
            Object.assign(hlsHeaders, resp.headers);
        }
        
        delete hlsHeaders['transfer-encoding'];
        delete hlsHeaders['cache-control'];
        
        if (hlsHeaders['content-encoding'] == 'gzip') {
            delete hlsHeaders['content-encoding'];
        }
        
        outResp.code(resp.status).headers(hlsHeaders);
        return hls;
    } else {
        outResp.redirect(purl);
        return;
    }
}

async function play(inReq, _outResp) {
    const id = inReq.body.id;
    
    if (id.indexOf('.m3u8') < 0) {
        const sniffer = await inReq.server.messageToDart({
            action: 'sniff',
            opt: {
                url: id,
                timeout: 10000,
                rule: 'http((?!http).){12,}?\\.m3u8(?!\\?)',
            },
        });
        
        if (sniffer && sniffer.url) {
            const hds = {};
            if (sniffer.headers) {
                if (sniffer.headers['user-agent']) {
                    hds['User-Agent'] = sniffer.headers['user-agent'];
                }
                if (sniffer.headers['referer']) {
                    hds['Referer'] = sniffer.headers['referer'];
                }
            }
            return {
                parse: 0,
                url: sniffer.url,
                header: hds,
            };
        }
    }
    
    return {
        parse: 0,
        url: inReq.server.address().dynamic + inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(id) + '/.m3u8',
    };
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const data = await request(url + `?ac=detail&wd=${wd}`);
    let videos = [];
    
    for (const vod of data.list) {
        videos.push({
            vod_id: vod.vod_id.toString(),
            vod_name: vod.vod_name.toString(),
            vod_pic: vod.vod_pic,
            vod_remarks: vod.vod_remarks,
        });
    }
    
    return {
        page: parseInt(data.page),
        pagecount: data.pagecount,
        total: data.total,
        list: videos,
    };
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode == 500) {
                console.error(json);
            }
        };
        const prefix = inReq.server.prefix;
        const dataResult = {};
        
        let resp = await inReq.server.inject().post(`${prefix}/init`);
        dataResult.init = resp.json();
        printErr(resp.json());
        
        resp = await inReq.server.inject().post(`${prefix}/home`);
        dataResult.home = resp.json();
        printErr(resp.json());
        
        if (dataResult.home.class.length > 0) {
            resp = await inReq.server.inject().post(`${prefix}/category`).payload({
                id: dataResult.home.class[0].type_id,
                page: 1,
                filter: true,
                filters: {},
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            
            if (dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id,
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    for (const vod of dataResult.detail.list) {
                        const flags = vod.vod_play_from.split('$$$');
                        const ids = vod.vod_play_url.split('$$$');
                        for (let j = 0; j < flags.length; j++) {
                            const flag = flags[j];
                            const urls = ids[j].split('#');
                            for (let i = 0; i < urls.length && i < 2; i++) {
                                resp = await inReq.server
                                    .inject()
                                    .post(`${prefix}/play`)
                                    .payload({
                                        flag: flag,
                                        id: urls[i].split('$')[1],
                                    });
                                dataResult.play.push(resp.json());
                            }
                        }
                    }
                }
            }
        }
        
        resp = await inReq.server.inject().post(`${prefix}/search`).payload({
            wd: '爱',
            page: 1,
        });
        dataResult.search = resp.json();
        printErr(resp.json());
        
        return dataResult;
    } catch (err) {
        console.error(err);
        outResp.code(500);
        return { err: err.message, tip: 'check debug console output' };
    }
}

export default {
    meta: {
        key: 'bfm3u8',
        name: '暴风 | 影视',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.get('/proxy/:what/:ids/:end', proxy);
        fastify.get('/test', test);
    },
};
