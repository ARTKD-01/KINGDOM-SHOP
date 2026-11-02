
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function getProductEmbed() {
    const fs = require('fs').promises;
    const stockData = JSON.parse(await fs.readFile('./products/stock/product2.json', 'utf8'));
    
    let totalStock = 0;
    if (stockData.chances) {
        for (const chance in stockData.chances) {
            totalStock += stockData.chances[chance].length;
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('``✨`` คีย์เปิดเว็บ V2')
        .setDescription(
            '**รายละเอียดสินค้า**\n' +
            '```เช่าเว็บราคาถูก มีปัญหาอะรติดต่อได้เลยนะครับ```'
        )
        .addFields(
            { name: '``💰`` ราคาสินค้า', value: `\`\`\`${stockData.price} บาท\`\`\``, inline: true },
            { name: '``📦`` สินค้าเหลือ', value: `\`\`\`${totalStock} ชิ้น\`\`\``, inline: true  }
        )
        .setColor('#00FFFF')
        .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1425151020786516068/animated-line-image-0379.gif?ex=68e68ad1&is=68e53951&hm=ed1b9b92dc843c844f8c09e71bb8921355678513012342c17b5b4de046972465&');
    
    return { embed };
}

module.exports = { getProductEmbed };
