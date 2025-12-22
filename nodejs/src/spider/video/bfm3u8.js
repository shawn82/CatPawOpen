/**
 * 暴风资源采集源
 * 基于 CatPawOpen 标准格式
 * API: https://bfzyapi.com/api.php/provide/vod/
 */

import * as HLS from 'hls-parser';
import req from '../../util/req.js';

let url = '';

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

async function init(inReq, _outResp) {
    url = inReq.server.config.bfm3u8.url;
    return {};
}

const testSiteLikes = [];

async function home(_inReq, _outResp) {
    const data = await request(url);

    // 从API获取所有分类，创建映射表
    const categoryMap = {};
    for (const cls of data.class) {
        const name = cls.type_name.toString().trim();
        categoryMap[name] = cls.type_id.toString();
    }

    // 定义大分类（直接硬编码）
    let classes = [
        {type_id: categoryMap["电影片"] || "1", type_name: "电影片"},
        {type_id: categoryMap["连续剧"] || "2", type_name: "连续剧"},
        {type_id: categoryMap["动漫片"] || "3", type_name: "动漫片"},
        {type_id: categoryMap["综艺片"] || "4", type_name: "综艺片"},
        {type_id: categoryMap["短剧大全"] || "5", type_name: "短剧大全"},
        {type_id: categoryMap["电影解说"] || "6", type_name: "电影解说"},
        {type_id: categoryMap["体育赛事"] || "7", type_name: "体育赛事"}
    ];

    // 定义筛选器（小分类作为筛选项）
    let filterObj = {};

    // 电影片的筛选器
    if (categoryMap["电影片"]) {
        filterObj[categoryMap["电影片"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "动作片", v: categoryMap["动作片"] || ""},
                {n: "喜剧片", v: categoryMap["喜剧片"] || ""},
                {n: "恐怖片", v: categoryMap["恐怖片"] || ""},
                {n: "科幻片", v: categoryMap["科幻片"] || ""},
                {n: "爱情片", v: categoryMap["爱情片"] || ""},
                {n: "剧情片", v: categoryMap["剧情片"] || ""},
                {n: "战争片", v: categoryMap["战争片"] || ""},
                {n: "纪录片", v: categoryMap["纪录片"] || ""},
                {n: "动画片", v: categoryMap["动画片"] || ""}
            ]
        }];
    }

    // 连续剧的筛选器
    if (categoryMap["连续剧"]) {
        filterObj[categoryMap["连续剧"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "国产剧", v: categoryMap["国产剧"] || ""},
                {n: "欧美剧", v: categoryMap["欧美剧"] || ""},
                {n: "香港剧", v: categoryMap["香港剧"] || ""},
                {n: "韩国剧", v: categoryMap["韩国剧"] || ""},
                {n: "台湾剧", v: categoryMap["台湾剧"] || ""},
                {n: "日本剧", v: categoryMap["日本剧"] || ""},
                {n: "海外剧", v: categoryMap["海外剧"] || ""},
                {n: "泰国剧", v: categoryMap["泰国剧"] || ""}
            ]
        }];
    }

    // 动漫片的筛选器
    if (categoryMap["动漫片"]) {
        filterObj[categoryMap["动漫片"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "国产动漫", v: categoryMap["国产动漫"] || ""},
                {n: "日韩动漫", v: categoryMap["日韩动漫"] || ""},
                {n: "欧美动漫", v: categoryMap["欧美动漫"] || ""}
            ]
        }];
    }

    // 综艺片的筛选器
    if (categoryMap["综艺片"]) {
        filterObj[categoryMap["综艺片"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "大陆综艺", v: categoryMap["大陆综艺"] || ""},
                {n: "港台综艺", v: categoryMap["港台综艺"] || ""},
                {n: "日韩综艺", v: categoryMap["日韩综艺"] || ""},
                {n: "欧美综艺", v: categoryMap["欧美综艺"] || ""}
            ]
        }];
    }

    // 短剧大全的筛选器
    if (categoryMap["短剧大全"]) {
        filterObj[categoryMap["短剧大全"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "重生民国", v: categoryMap["重生民国"] || ""},
                {n: "穿越年代", v: categoryMap["穿越年代"] || ""},
                {n: "现代言情", v: categoryMap["现代言情"] || ""},
                {n: "反转爽文", v: categoryMap["反转爽文"] || ""}
            ]
        }];
    }

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

    return JSON.stringify({
        class: classes,
        filters: filterObj,
    });
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page;
    const filters = inReq.body.filters;
    let page = pg || 1;
    if (page == 0) page = 1;

    // 如果有filters且有class筛选，使用class的type_id，否则使用tid
    const actualTid = (filters && filters.class) ? filters.class : tid;

    const data = await request(url + `?ac=detail&t=${actualTid}&pg=${page}`);
    let videos = [];
    for (const vod of data.list) {
        videos.push({
            vod_id: vod.vod_id.toString(),
            vod_name: vod.vod_name.toString(),
            vod_pic: vod.vod_pic,
            vod_remarks: vod.vod_remarks,
        });
    }
    return JSON.stringify({
        page: parseInt(data.page),
        pagecount: data.pagecount,
        total: data.total,
        list: videos,
    });
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
