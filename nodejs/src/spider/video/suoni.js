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
    url = inReq.server.config.suoni.url;
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

    // 定义大分类
    let classes = [
        {type_id: categoryMap["电影"] || "1", type_name: "电影"},
        {type_id: categoryMap["电视剧"] || "2", type_name: "电视剧"},
        {type_id: categoryMap["综艺"] || "3", type_name: "综艺"},
        {type_id: categoryMap["动漫"] || "4", type_name: "动漫"},
        {type_id: categoryMap["体育赛事"] || "48", type_name: "体育赛事"},
        {type_id: categoryMap["影视解说"] || "53", type_name: "影视解说"},
        {type_id: categoryMap["爽文短剧"] || "54", type_name: "爽文短剧"}
    ];

    // 定义筛选器
    let filterObj = {};

    // 电影的筛选器
    if (categoryMap["电影"]) {
        filterObj[categoryMap["电影"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "动作片", v: categoryMap["动作片"] || ""},
                {n: "喜剧片", v: categoryMap["喜剧片"] || ""},
                {n: "爱情片", v: categoryMap["爱情片"] || ""},
                {n: "科幻片", v: categoryMap["科幻片"] || ""},
                {n: "恐怖片", v: categoryMap["恐怖片"] || ""},
                {n: "剧情片", v: categoryMap["剧情片"] || ""},
                {n: "战争片", v: categoryMap["战争片"] || ""},
                {n: "纪录片", v: categoryMap["纪录片"] || ""},
                {n: "动画片", v: categoryMap["动画片"] || ""},
                {n: "4K电影", v: categoryMap["4K电影"] || ""},
                {n: "邵氏电影", v: categoryMap["邵氏电影"] || ""},
                {n: "Netflix电影", v: categoryMap["Netflix电影"] || ""}
            ]
        }];
    }

    // 电视剧的筛选器
    if (categoryMap["电视剧"]) {
        filterObj[categoryMap["电视剧"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "国产剧", v: categoryMap["国产剧"] || ""},
                {n: "欧美剧", v: categoryMap["欧美剧"] || ""},
                {n: "韩剧", v: categoryMap["韩剧"] || ""},
                {n: "日剧", v: categoryMap["日剧"] || ""},
                {n: "港剧", v: categoryMap["港剧"] || ""},
                {n: "台剧", v: categoryMap["台剧"] || ""},
                {n: "泰剧", v: categoryMap["泰剧"] || ""},
                {n: "海外剧", v: categoryMap["海外剧"] || ""},
                {n: "Netflix自制剧", v: categoryMap["Netflix自制剧"] || ""}
            ]
        }];
    }

    // 综艺的筛选器
    if (categoryMap["综艺"]) {
        filterObj[categoryMap["综艺"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "大陆综艺", v: categoryMap["大陆综艺"] || ""},
                {n: "日韩综艺", v: categoryMap["日韩综艺"] || ""},
                {n: "港台综艺", v: categoryMap["港台综艺"] || ""},
                {n: "欧美综艺", v: categoryMap["欧美综艺"] || ""},
                {n: "演唱会", v: categoryMap["演唱会"] || ""}
            ]
        }];
    }

    // 动漫的筛选器
    if (categoryMap["动漫"]) {
        filterObj[categoryMap["动漫"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "国产动漫", v: categoryMap["国产动漫"] || ""},
                {n: "日韩动漫", v: categoryMap["日韩动漫"] || ""},
                {n: "欧美动漫", v: categoryMap["欧美动漫"] || ""},
                {n: "港台动漫", v: categoryMap["港台动漫"] || ""},
                {n: "海外动漫", v: categoryMap["海外动漫"] || ""},
                {n: "有声动漫", v: categoryMap["有声动漫"] || ""}
            ]
        }];
    }

    // 体育赛事的筛选器
    if (categoryMap["体育赛事"]) {
        filterObj[categoryMap["体育赛事"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "篮球", v: categoryMap["篮球"] || ""},
                {n: "足球", v: categoryMap["足球"] || ""},
                {n: "斯诺克", v: categoryMap["斯诺克"] || ""}
            ]
        }];
    }

    // 爽文短剧的筛选器
    if (categoryMap["爽文短剧"]) {
        filterObj[categoryMap["爽文短剧"]] = [{
            key: "class",
            name: "分类",
            value: [
                {n: "全部", v: ""},
                {n: "女频恋爱", v: categoryMap["女频恋爱"] || ""},
                {n: "反转爽剧", v: categoryMap["反转爽剧"] || ""},
                {n: "古装仙侠", v: categoryMap["古装仙侠"] || ""},
                {n: "年代穿越", v: categoryMap["年代穿越"] || ""},
                {n: "脑洞悬疑", v: categoryMap["脑洞悬疑"] || ""},
                {n: "现代都市", v: categoryMap["现代都市"] || ""}
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
        key: 'suoni',      // 修改这里
        name: '索尼 | 影视',      // 修改这里
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
