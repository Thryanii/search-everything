const cheerio = require('cheerio');
const util = require('./util');
const httpGet = require('./httpGet');
const page = require('./page');
const stringSimilarity = require('string-similarity');

/**
 * @typedef {Object} ResultItem
 * @property {string} title 条目标题
 * @property {string} link 条目链接
 * @property {string} description 条目摘要
 */


// ----------------------------------------------------------------
// 目录
// $('ul.mw-search-results').find('li').each((i, element) => {
//     let title = $(element).find('a').attr('title');
//     let href = $(element).find('a').attr('href');
//     let content = $(element).find('.searchresult').text();
//     console.log(title)
// })
// 1.存在相关主页,跳转到页面
// 2.不存在相关主页,返回搜索列表,自动重定向至第一个页面
// 3.没有或少量搜索结果
/**
 * 萌娘百科(可能无搜索结果)
 * @param {string} search - 搜索内容
 * @returns {Promise<{data:ResultItem, page:boolean}>} 页面文本
 */
const moegirl = async (search, then) => {
    try {
        let res = await httpGet.normal(`https://zh.moegirl.org.cn/index.php?title=Special:%E6%90%9C%E7%B4%A2&variant=Special%3ASearch&search=${encodeURI(search)}`)
        const $ = cheerio.load(res)
        if (res.includes("找不到和查询相匹配的结果")) {
            return { description: "", oage: false }
        }
        if ($('ul').hasClass('mw-search-results')) {
            if ($('ul.mw-search-results').find('li').length <= 3) {
                return { description: "", page: false }
            }
            let first = $('ul.mw-search-results').find('li')
            //let title = first.find('a').attr('title');
            //let content = first.find('.searchresult').text();
            let href = first.find('a').attr('href');
            return { data: await page.moegirl(undefined, `https://zh.moegirl.org.cn${href}`), page: false }
        } else {
            return { data: await page.moegirl(res), page: true }
        }
    }
    catch (err) {
        console.log(err)
    }
}



/**
 * 必应搜索(可能无搜索结果)
 * @param {string} search - 搜索内容
 * @returns {Promise<ResultItem[]>} 
 */
const bing = async (search) => {
    let options = {
        method: "GET",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 Edg/112.0.1722.68",//"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 UBrowser/6.1.2107.204 Safari/537.36",
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
        }
    }
    let ret = await httpGet.normal(`https://cn.bing.com/search?q=${encodeURI(search.replace(/\s+/, '+'))}`, options)
    const results = [];
    if (ret.includes("没有与此相关的结果")) return results
    const $ = cheerio.load(ret);
    $('.b_algo').each((_index, element) => {
        const title = $(element).find('h2').text().trim();
        const link = $(element).find('a').attr('href').trim();
        const description = $(element).find('.b_caption p').text().replace(/(\d+年)?\d+月\d+日/, '').replace("网页", '').trim();
        results.push({
            title,
            link,
            description
        });
    });
    return results
}



/**
 * 今日头条百科(这b东西搜出来一堆无关东西)
 * @param {string} search - 搜索内容
 * @returns {Promise<ResultItem[]>} 百科搜索结果(数组)
 */
const baike = async (search) => {
    let results = []
    try {
        let ret = await httpGet.normal(`https://www.baike.com/search?keyword=${encodeURI(search)}`)
        //util.writeFile('baike.html', ret)
        let $ = cheerio.load(ret)
        let wiki = $('body').find('script').first().text().replace(/var DATA =\s+{\s+data:/, '').replace(/\\u003c\/*em>/g, '').trim()
        let wikiDocList = JSON.parse(wiki.slice(0, wiki.length - 1)).WikiDocList
        wikiDocList.forEach(element => {
            let titleSimilarity = stringSimilarity.compareTwoStrings(element.Title, search)
            if (titleSimilarity > 0.5)
                results.push({
                    title: element.Title,
                    link: 'https://www.baike.com/wikiid/' + element.WikiDocID,
                    description: element.Abstract
                })
        })
        return results
    } catch (err) {
        console.log(err)
    }
}


/**
 * bilibili(这b玩意儿还要cookies)
 * @param {string} search - 搜索内容
 * @returns {Promise<ResultItem[]>} 视频列表
 */
const bilibili = async (search) => {
    let results = []
    try {
        let cookies = await httpGet.withCookies(`https://bilibili.com/`, {}, true)
        let ret = await httpGet.normal(`https://api.bilibili.com/x/web-interface/search/type?&page=1&search_type=video&keyword=${encodeURI(search)}`, undefined, cookies)
        ret = JSON.parse(ret.slice(0, ret.length - 1)).data
        if (ret.numResults == 0) return results //没有结果
        ret.result.forEach(element => {
            results.push({
                title: element.title.replace(/<em class="keyword">|<\/em>/g, ''),
                link: 'https://b23.tv/' + element.bvid,
                description: element.description
            })
        })
        return results
    } catch (err) {
        if (err.statusCode == 412) {
            console.log("bilibili请求被拦截")
        }
        else console.log(err)
    }
}


/**
 * 知乎
 * @param {string} search - 搜索内容
 * @returns {Promise<ResultItem[]>} 问题列表
 * @example
 * search.zhihu('chatgpt').then(res => {
 *    if(res.length > 0) {
 *        return page.zhihu(res[0].link)
 *    }
 * }).then(res => { 
 *    console.log(res)
 * })
 */
const zhihu = async (search) => {
    try {
        let ret = await bing(search + '+site:"www.zhihu.com/question"')
        return ret
    } catch (err) {
        console.log(err)
    }
}

/**
 * 新浪微博(搜不出什么东西)
 * @param {string} search - 搜索内容
 * @returns {Promise<ResultItem[]>} 微博
 */
const weibo = async (search) => {
    try {
        let ret = await bing(search + '+site:weibo.cn/detail+OR+site:weibo.cn/status')
        return ret
    } catch (err) {
        console.log(err)
    }
}

module.exports = { moegirl, bing, baike, bilibili, zhihu, weibo }