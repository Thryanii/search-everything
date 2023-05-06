const cheerio = require('cheerio');
const util = require('./util');
const httpGet = require('./httpGet');


/**
 * 萌娘百科页面解析
 * @param {string|undefined} html - h5
 * @param {string|undefined} url - 页面链接
 * @returns {Promise<ResultItem>} 解析数据
 */
const moegirl = async (html, url) => {
    try {
        if (html == undefined) html = await httpGet.normal(url)
        const $ = cheerio.load(html)
        $('script').remove()
        $('style').remove()
        let title = $('title').text()
        let link = $('link[rel="canonical"]').attr('href')
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
        return { title, link, description }
    } catch (err) {
        console.log(err)
    }
}

/**
 * 知乎问题页面解析
 * @param {string|undefined} url - 页面链接
 * @returns {Promise<ResultItem>} 解析数据
 */
const zhihu = async (url) => {
    try {
        let html = await httpGet.normal(url)
        const $ = cheerio.load(html)
        $('style').remove()
        let data = JSON.parse($('script[id="js-initialData"]').text()).initialState.entities
        let question = data.questions[Object.keys(data.questions)[0]]
        let description = '' + question.excerpt
        for (let key in data.answers) {
            description += data.answers[key].excerpt
        }
        return { title: question.title, link: url, description: description.replace(/\[图片\]/g, '') }
    } catch (err) {
        console.log(err)
    }
}

module.exports = { moegirl, zhihu }