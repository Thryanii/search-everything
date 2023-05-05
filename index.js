const request = require('request');
const cheerio = require('cheerio');
//const util = require('./util');
const stringSimilarity = require('string-similarity');

const MoegirlSearch = (search) => {
    return new Promise((resolve, reject) => {
        const url = `https://zh.moegirl.org.cn/index.php?title=Special:%E6%90%9C%E7%B4%A2&variant=Special%3ASearch&search=${search}`;
        request.get(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(new Error(`请求失败，状态码为 ${response.statusCode}`));
            } else {
                resolve(body);
            }
        });
    });
}

const MoegirlPage = (page) => {
    return new Promise((resolve, reject) => {
        const url = `https://zh.moegirl.org.cn${page}`;
        request.get(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(new Error(`请求失败，状态码为 ${response.statusCode}`));
            } else {
                resolve(body);
            }
        });
    });
}

const moegirlPageParser = (html) => {
    const $ = cheerio.load(html)
    $('script').remove()
    $('style').remove()
    let description = ""
    //若基本资料内容少，则搜索文章一部分p标签
    let lastElement
    $('tbody').each((i, element) => {
        if ($(element).find('tr.infobox-title').length >= 1) {
            description = $(element).text().trim().replace(/(\n{3,})/g, ',').replace(/\s+/g, '')
            lastElement = element
        }
    })
    if (description.length < 200) {
        $('p').after(lastElement).each((i, element) => {
            description += $(element).text()
            if (description.length > 400) return false
        })
    }
    return description
}
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
 * @param {number} search - 搜索内容
 * @returns {Promise<{description:string,page:boolean}>} page:是否经过重定向
 */
const moegirl = async (search, then) => {
    try {
        let res = await MoegirlSearch(encodeURI(search))
        //util.writeFile("text.html", res)
        const $ = cheerio.load(res)
        if (res.includes("找不到和查询相匹配的结果")) {
            return { description: "", mainPage: false }
        }
        if ($('ul').hasClass('mw-search-results')) {
            if ($('ul.mw-search-results').find('li').length <= 3) {
                return { description: "", mainPage: false }
            }
            let first = $('ul.mw-search-results').find('li')
            let title = first.find('a').attr('title');
            let href = first.find('a').attr('href');
            let content = first.find('.searchresult').text();
            let page = await MoegirlPage(href)
            return { description: moegirlPageParser(page), page: false }
        } else {
            return { description: moegirlPageParser(res), page: true }
        }
    }
    catch (err) {
        console.log(err)
    }
}

/**
* @type {function (string): Promise<string>} 
*/
const BingSearch = async (question) => await new Promise((resolve, reject) => {
    let options = {
        method: "GET",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 Edg/112.0.1722.68",//"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 UBrowser/6.1.2107.204 Safari/537.36",
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
        }
    }
    request("https://cn.bing.com/search?q=" + question, options, (err, res, body) => {
        if (err) {
            reject(err)
        } else {
            resolve(body)
        }
    })
})

/**
 * 必应搜索(可能无搜索结果)
 * @param {number} search - 搜索内容
 * @returns {Promise<{title:string,link:string,description:string}[]>} result:是否有搜索结果
 */
const bing = async (search) => {
    let ret = await BingSearch(encodeURI(search.replace(/\s+/, '+')))
        .then(res => {
            return res
        })
        .catch(err => {
            return err
        })
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

const baikeSearch = (question) => new Promise((resolve, reject) => {
    let options = {
        method: "GET",
        headers: {
        }
    }
    request("https://www.baike.com/search?keyword=" + question, options, (err, res, body) => {
        if (err) {
            reject(err)
        } else {
            resolve(body)
        }
    })
})


/**
 * 今日头条百科(这b东西一定搜得出东西)
 * @param {number} search - 搜索内容
 * @returns {Promise<{title:string,similar:boolean,description:string}[]>} result一定为true
 */
const baike = async (search) => {
    let results = []
    try {
        let ret = await baikeSearch(encodeURI(search))
        //util.writeFile('baike.html', ret)
        let $ = cheerio.load(ret)
        let wiki = $('body').find('script').first().text().replace(/var DATA =\s+{\s+data:/, '').replace(/\\u003c\/*em>/g, '').trim()
        let wikiDocList = JSON.parse(wiki.slice(0, wiki.length - 1)).WikiDocList
        //console.log(wikiDocList)
        wikiDocList.some(element => {
            let titleSimilarity = stringSimilarity.compareTwoStrings(element.Title, search)
            let similar = titleSimilarity > 0.7
            results.push({
                title: element.Title,
                similar: similar,
                description: element.Abstract
            })
            if (results.length >= 3) return true
        })
        return results
    } catch (err) {
        console.log(err)
    }
}

module.exports = { moegirl, bing, baike }