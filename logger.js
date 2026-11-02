const { EmbedBuilder } = require('discord.js');

const GREEN = '#00FF00';
const RED = '#FF0000';
const BLUE = '#0099FF';

class Logger {
    static async sendTopupLog(user, amount, balance, link, logChannel, ownerName = 'ไม่ทราบ') {
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('``💰`` แจ้งเตือนเติมเงินสำเร็จ')
            .setDescription(
                `\`\`👤\`\` **ผู้ใช้:** **${user}**\n` +
                `\`\`💰\`\` **เติมเงินจำนวน:** **\`\`${amount} บาท\`\`**\n` +
                `\`\`💳\`\` **ยอดเงินคงเหลือ:** **\`\`${balance.toFixed(2)} บาท\`\`**\n` +
                `\`\`🧧\`\` **ชำระโดย:** \`${ownerName}\`\n` +
                `\`\`🔗\`\` **ลิงก์: [คลิกที่นี่](${link})**`
            )
            .setColor(GREEN)
            .setImage('https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        await logChannel.send({ embeds: [embed] });
    }


    static async sendProductPurchaseLog(user, productName, price, balance, logChannel, productEmoji = '📦') {
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('``📦`` แจ้งเตือนลูกค้าซื้อไอดีเกม')
            .setDescription(
            `\`\`👤\`\` **ผู้ใช้:** **${user}**\n` +
            `\`\`${productEmoji}\`\` **สินค้า:** **\`\`${productName}\`\`**\n` +
            `\`\`📦\`\` **จำนวน:** **\`\`1 ชิ้น\`\`**\n` +
            `\`\`💰\`\` **ราคารวม:** **\`\`${price} บาท\`\`**\n` +
            `\`\`💳\`\` **ยอดคงเหลือ:** **\`\`${balance.toFixed(2)} บาท\`\`**\n`
            )
            .setColor(BLUE)
            .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1425151020786516068/animated-line-image-0379.gif?ex=68e68ad1&is=68e53951&hm=ed1b9b92dc843c844f8c09e71bb8921355678513012342c17b5b4de046972465&')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        await logChannel.send({ embeds: [embed] });
    }

    
    static async sendBalanceLog(admin, user, amount, balance, action, logChannel) {
        if (!logChannel) return;

        const actionText = amount > 0 ? 'เพิ่ม' : 'ลด';
        const color = amount > 0 ? GREEN : RED;
        const amountText = amount > 0 ? `+${amount}` : amount;

        const embed = new EmbedBuilder()
            .setTitle('``🏛️`` แอดมินจัดการยอดเงิน')
            .setDescription(
                `\`\`👑\`\` **แอดมิน:** **${admin}**\n` +
                `\`\`👤\`\` **ผู้ใช้:** **${user}**\n` +
                `\`\`💰\`\` **จำนวน:** **\`\`${amountText} บาท\`\`**\n` +
                `\`\`💳\`\` **ยอดคงเหลือ:** **\`\`${balance.toFixed(2)} บาท\`\`**\n` +
                `\`\`📝\`\` **ได้ทำการ:** **\`\`${actionText}ยอดเงินสำเร็จ\`\`**`
                )
            .setColor(color)
            .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1425151020786516068/animated-line-image-0379.gif?ex=68e68ad1&is=68e53951&hm=ed1b9b92dc843c844f8c09e71bb8921355678513012342c17b5b4de046972465&')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        await logChannel.send({ embeds: [embed] });
    }
}

module.exports = Logger;