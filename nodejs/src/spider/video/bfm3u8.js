/**
 * 暴风资源采集源
 * 基于 CatPawOpen 标准格式
 * API: https://bfzyapi.com/api.php/provide/vod/
 */

import * as HLS from 'hls-parser';
import req from '../../util/req.js';

const API_URL = 'https://bfzyapi.com/api.php/provide/vod/';
let url = API_URL;

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

async function init(inReq, _outResp) {
    // 优先使用 config 中的自定义 URL（如果存在）
    if (inReq.server.config?.bfm3u8?.url) {
        url = inReq.server.config.bfm3u8.url;
    } else {
        url = API_URL;
    }
    return {};
}

const testSiteLikes = [];

async function home(_inReq, _outResp) {
    const data = await request(url);

    // 定义大分类（直接使用 type_id）
    let classes = [
        {type_id: "20", type_name: "电影片"},
        {type_id: "30", type_name: "连续剧"},
        {type_id: "39", type_name: "动漫片"},
        {type_id: "45", type_name: "综艺片"},
        {type_id: "58", type_name: "短剧大全"},
        {type_id: "51", type_name: "电影解说"},
        {type_id: "53", type_name: "体育赛事"}
    ];

    // 定义筛选器（直接使用 type_id）
    let filterObj = {};

    // 电影片的筛选器
    filterObj["20"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "动作片", v: "21"},
            {n: "喜剧片", v: "22"},
            {n: "恐怖片", v: "23"},
            {n: "科幻片", v: "24"},
            {n: "爱情片", v: "25"},
            {n: "剧情片", v: "26"},
            {n: "战争片", v: "27"},
            {n: "纪录片", v: "28"},
            {n: "动画片", v: "50"}
        ]
    }];

    // 连续剧的筛选器
    filterObj["30"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "国产剧", v: "31"},
            {n: "欧美剧", v: "32"},
            {n: "香港剧", v: "33"},
            {n: "韩国剧", v: "34"},
            {n: "台湾剧", v: "35"},
            {n: "日本剧", v: "36"},
            {n: "海外剧", v: "37"},
            {n: "泰国剧", v: "38"}
        ]
    }];

    // 动漫片的筛选器
    filterObj["39"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "国产动漫", v: "40"},
            {n: "日韩动漫", v: "41"},
            {n: "欧美动漫", v: "42"},
            {n: "港台动漫", v: "43"},
            {n: "海外动漫", v: "44"}
        ]
    }];

    // 综艺片的筛选器
    filterObj["45"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "大陆综艺", v: "46"},
            {n: "港台综艺", v: "47"},
            {n: "日韩综艺", v: "48"},
            {n: "欧美综艺", v: "49"}
        ]
    }];

    // 短剧大全的筛选器
    filterObj["58"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "重生民国", v: "65"},
            {n: "穿越年代", v: "66"},
            {n: "现代言情", v: "67"},
            {n: "反转爽文", v: "68"}
        ]
    }];

    // 体育赛事的筛选器
    filterObj["53"] = [{
        key: "class",
        name: "分类",
        value: [
            {n: "全部", v: ""},
            {n: "足球", v: "54"},
            {n: "篮球", v: "55"},
            {n: "网球", v: "56"},
            {n: "斯诺克", v: "57"}
        ]
    }];

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
