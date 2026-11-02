const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    StringSelectMenuBuilder, 
    ButtonStyle, 
    REST, 
    Routes, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const TopupSystem = require('./topup/topup_trueWallet');
const Logger = require('./logger');

// ==========================================
// ⚙️ CONFIGURATION & CONSTANTS
// ==========================================
const TOKEN = 'MTU2NjU1NjgzNjMzMTc5MDM2Ng.G84A3z.4DwZFL17yS37eKbvrBXUNm_PFXdS-6yLQrVQX4';
const ADMIN_IDS = ['1511705591096279040'];
const LOG_TOPUP_CHANNEL_ID = '1520969669035692102'; // ห้อง Log เติมเงิน & จัดการยอดเงิน
const LOG_BUY_CHANNEL_ID = '1520970061894914088';   // ห้อง Log ซื้อของ
const PHONE = '0816382327';

const IMG_BANNER = 'https://cdn.discordapp.com/attachments/1373550875435470869/1425151020786516068/animated-line-image-0379.gif?ex=68e68ad1&is=68e53951&hm=ed1b9b92dc843c844f8c09e71bb8921355678513012342c17b5b4de046972465&';

// ==========================================
// 🤖 CLIENT & SYSTEM SETUP
// ==========================================
const topupSystem = new TopupSystem({
    phoneNumber: PHONE,
    databasePath: './data'
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// ==========================================
// 📁 HELPER & DATA FUNCTIONS
// ==========================================
function checkAdmin(interaction) {
    if (!ADMIN_IDS.includes(interaction.user.id)) {
        interaction.reply({ 
            embeds: [new EmbedBuilder().setTitle('``❌`` ไม่มีสิทธิ์').setColor('#ff0000')], 
            ephemeral: true 
        });
        return false;
    }
    return true;
}

async function loadJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        console.error(`Error loading ${filePath}:`, error);
        return null;
    }
}

async function saveJSON(filePath, data) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error);
    }
}

async function loadCategories() {
    const filePath = './data/categories.json';
    let categories = await loadJSON(filePath);
    if (!categories) {
        categories = [
            {
                id: 'cat_green',
                name: 'หมวดหมู่: เงินเขียว',
                description: 'รวมบริการเงินเขียว',
                emoji: '🟢',
                products: [
                    { id: '1', name: 'เงินเขียว 10k', description: 'บริการเงินเขียว 10k', price: 0 },
                    { id: '2', name: 'เงินเขียว 100k', description: 'บริการเงินเขียว 100k', price: 0 },
                    { id: '3', name: 'เงินเขียว 1M', description: 'บริการเงินเขียว 1M', price: 0 }
                ]
            },
            {
                id: 'cat_red',
                name: 'หมวดหมู่: เงินแดง',
                description: 'รวมบริการเงินแดง',
                emoji: '🔴',
                products: [
                    { id: '4', name: 'เงินแดง 1k', description: 'บริการเงินแดง 1k', price: 0 },
                    { id: '5', name: 'เงินแดง 5k', description: 'บริการเงินแดง 5k', price: 0 },
                    { id: '6', name: 'เงินแดง 10k', description: 'บริการเงินแดง 10k', price: 0 }
                ]
            }
        ];
        await saveJSON(filePath, categories);
    }
    return categories;
}

async function saveCategories(categories) {
    await saveJSON('./data/categories.json', categories);
}

async function getProductStock(productId) {
    const filePath = `./products/stock/product${productId}.json`;
    let stock = await loadJSON(filePath);
    if (!stock) {
        stock = { price: 0, stock: [], sold: 0 };
        await saveJSON(filePath, stock);
    }
    return stock;
}

async function saveProductStock(productId, data) {
    await saveJSON(`./products/stock/product${productId}.json`, data);
}

async function getUserMoney(userId) {
    const userData = await topupSystem.getUserData(userId);
    return userData.point || 0;
}

async function savePurchaseHistory(userId, productName, productData, price) {
    const filePath = `./sold/userBuy_${userId}.json`;
    await fs.mkdir('./sold', { recursive: true });

    let history = await loadJSON(filePath) || { purchases: [] };
    history.purchases.push({
        productName,
        productData,
        price,
        timestamp: new Date().toISOString()
    });
    await saveJSON(filePath, history);
}

// ==========================================
// 🎨 UI COMPONENTS & BUILDERS
// ==========================================
async function createShopEmbed() {
    const embed = new EmbedBuilder()
        .setDescription(
            '# ``⏳`` บริการขายของ ANGEL CITY\n' +
            '```เริ่มต้นเพียง 1 บาท```\n' +
            '## ``🛠`` การดูแลจากร้าน\n' +
            ' ```ซื้อไปเเล้ว มีปัญหาหรือถ้าซื้อเเล้ว\n' +
            'สามารถเปิด TICKET เพื่อให้ทีมงานเอาของให้\n' +
            'ห้ามกด TICKET เล่น ถ้าพบเจอแบน```\n'
        )
        .setImage(IMG_BANNER);

    const categories = await loadCategories();
    const selectOptions = [];
    const seenCatIds = new Set();
    
    for (const cat of categories) {
        if (seenCatIds.has(cat.id)) continue;
        seenCatIds.add(cat.id);
        selectOptions.push({
            label: cat.name,
            description: cat.description || 'คลิกเพื่อดูสินค้าในหมวดหมู่นี้',
            value: `category_${cat.id}`,
            emoji: cat.emoji || '📁'
        });
    }

    selectOptions.push({
        label: 'ล้างตัวเลือกใหม่',
        value: 'refresh_menu',
        emoji: '<:Ldelete:1387382890781999115>'
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('|︲📁 เลือกหมวดหมู่สินค้าที่คุณต้องการ︲|')
        .addOptions(selectOptions);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('topup_money')
                .setLabel('『 เติมเงินเข้าสู่ระบบ 』')
                .setStyle(ButtonStyle.Success)
                .setEmoji('<a:BitCoin:1407944663780032543>'),
            new ButtonBuilder()
                .setCustomId('check_balance')
                .setLabel('『 เช็คยอดเงินคงเหลือ 』')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:UN145:1407344712221855855>'),
            new ButtonBuilder()
                .setCustomId('refresh_main_menu')
                .setLabel('🔄 รีเฟรชเมนู')
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(selectMenu), buttons]
    };
}

// ==========================================
// 🚀 EVENT: READY & SLASH COMMAND REGISTRATION
// ==========================================
client.once('ready', async () => {
    console.log(`[STATUS] ✅ บอทพร้อมทำงานแล้ว: ${client.user.tag}`);

    const commands = [
        {
            name: 'ติดตั้งเมนูขายไอดี',
            description: '[ 🌿 ติดตั้งระบบขายไอดีเกม ]',
            options: [{ name: 'channel', description: '[ 💬 เลือกช่องที่ต้องการส่งเมนู ]', type: 7, required: true }]
        },
        {
            name: 'เพิ่มหมวดหมู่',
            description: '[ 📁 สร้างหมวดหมู่สินค้าใหม่ ]',
            options: [
                { name: 'id', description: '[ 🔑 รหัสหมวดหมู่ เช่น cat_game ]', type: 3, required: true },
                { name: 'name', description: '[ 🏷️ ชื่อหมวดหมู่ ]', type: 3, required: true },
                { name: 'description', description: '[ 📝 รายละเอียดหมวดหมู่ ]', type: 3, required: true },
                { name: 'emoji', description: '[ ✨ อิโมจิหมวดหมู่ ]', type: 3, required: false }
            ]
        },
        {
            name: 'แก้ไขหมวดหมู่',
            description: '[ ✏️ แก้ไขข้อมูลหมวดหมู่ ]',
            options: [
                { name: 'category_id', description: '[ 📁 เลือกหมวดหมู่ ]', type: 3, required: true, autocomplete: true },
                { name: 'name', description: '[ 🏷️ ชื่อใหม่ ]', type: 3, required: false },
                { name: 'description', description: '[ 📝 รายละเอียดใหม่ ]', type: 3, required: false },
                { name: 'emoji', description: '[ ✨ อิโมจิใหม่ ]', type: 3, required: false }
            ]
        },
        {
            name: 'ลบหมวดหมู่',
            description: '[ 🗑️ ลบหมวดหมู่สินค้า ]',
            options: [{ name: 'category_id', description: '[ 📁 เลือกหมวดหมู่ที่จะลบ ]', type: 3, required: true, autocomplete: true }]
        },
        {
            name: 'เพิ่มสินค้าในหมวดหมู่',
            description: '[ 📦 เพิ่มสินค้าใหม่เข้าหมวดหมู่ ]',
            options: [
                { name: 'category_id', description: '[ 📁 เลือกหมวดหมู่ ]', type: 3, required: true, autocomplete: true },
                { name: 'product_id', description: '[ 🔑 รหัสสินค้า เช่น 7 ]', type: 3, required: true },
                { name: 'name', description: '[ 🏷️ ชื่อสินค้า ]', type: 3, required: true },
                { name: 'description', description: '[ 📝 รายละเอียดสินค้า ]', type: 3, required: true },
                { name: 'price', description: '[ 💰 ราคาเริ่มต้น ]', type: 10, required: true, min_value: 0 }
            ]
        },
        {
            name: 'แก้ไขสินค้าในหมวดหมู่',
            description: '[ ✏️ แก้ไขข้อมูลสินค้า ]',
            options: [
                { name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'name', description: '[ 🏷️ ชื่อใหม่ ]', type: 3, required: false },
                { name: 'description', description: '[ 📝 รายละเอียดใหม่ ]', type: 3, required: false }
            ]
        },
        {
            name: 'ลบสินค้าในหมวดหมู่',
            description: '[ 🗑️ ลบสินค้าออกจากหมวดหมู่ ]',
            options: [{ name: 'product', description: '[ 💬 เลือกสินค้าที่จะลบ ]', type: 3, required: true, autocomplete: true }]
        },
        {
            name: 'ตั้งราคาสินค้า',
            description: '[ 💵 ตั้งราคาสินค้า ]',
            options: [
                { name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'price', description: '[ 💵 ตั้งราคา ]', type: 10, required: true, min_value: 0 }
            ]
        },
        {
            name: 'แก้ไขราคาสินค้า',
            description: '[ 💵 แก้ไขราคาสินค้า ]',
            options: [
                { name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'price', description: '[ 💰 ราคาใหม่ ]', type: 10, required: true, min_value: 0 }
            ]
        },
        {
            name: 'ลบราคาสินค้า',
            description: '[ 💵 รีเซ็ตราคาเป็น 0 บาท ]',
            options: [{ name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true }]
        },
        {
            name: 'เพิ่มสต๊อกสินค้า',
            description: '[ 📦 เพิ่มสต๊อกสินค้า ]',
            options: [
                { name: 'สินค้าที่จะเพิ่ม', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'ตั้งโอกาส', description: '[ 🎲 โอกาส (0.1-100%) ]', type: 10, required: true, min_value: 0.1, max_value: 100 },
                { name: 'อัพโหลดสินค้า', description: '[ 📁 อัพโหลดไฟล์ .txt ]', type: 11, required: true }
            ]
        },
        {
            name: 'แก้ไขสต๊อกสินค้า',
            description: '[ ✏️ แทนที่สต๊อกสินค้าด้วยไฟล์ใหม่ตามโอกาส ]',
            options: [
                { name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'chance', description: '[ 🎲 โอกาส % ที่ต้องการแก้ไข ]', type: 10, required: true, min_value: 0.1, max_value: 100 },
                { name: 'อัพโหลดสินค้า', description: '[ 📁 อัพโหลดไฟล์ .txt ใหม่ ]', type: 11, required: true }
            ]
        },
        {
            name: 'ลบสต๊อกสินค้า',
            description: '[ 🗑️ ล้างสต๊อกสินค้าทั้งหมดหรือตามโอกาส ]',
            options: [
                { name: 'product', description: '[ 💬 เลือกสินค้า ]', type: 3, required: true, autocomplete: true },
                { name: 'chance', description: '[ 🎲 โอกาส % ]', type: 10, required: false, min_value: 0.1, max_value: 100 }
            ]
        },
        {
            name: 'จัดการยอดเงิน',
            description: '[ 💳 จัดการยอดเงินของผู้ใช้ ]',
            options: [
                { name: 'user', description: '[ 👤 เลือกผู้ใช้ ]', type: 6, required: true },
                {
                    name: 'action',
                    description: '[ ❓ เลือกการกระทำ ]',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '[✅] - เพิ่ม', value: 'add' },
                        { name: '[❌] - ลด', value: 'remove' }
                    ]
                },
                { name: 'amount', description: '[ 💰 จำนวนเงิน (ขั้นต่ำ 0.1) ]', type: 10, required: true, min_value: 0.1 }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[SUCCESS] ✅ ลงทะเบียนคำสั่งสำเร็จ');
    } catch (error) {
        console.error('[ERROR] ❌ ลงทะเบียนคำสั่งไม่สำเร็จ:', error);
    }
});

// ==========================================
// 📩 EVENT: INTERACTION ROUTER
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
    } else if (interaction.isCommand()) {
        await handleSlashCommands(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenus(interaction);
    } else if (interaction.isButton()) {
        await handleButtons(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModals(interaction);
    }
});

// ==========================================
// 🔍 AUTOCOMPLETE HANDLER
// ==========================================
async function handleAutocomplete(interaction) {
    const categories = await loadCategories();
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'category_id') {
        const filtered = categories.filter(c => 
            c.name.toLowerCase().includes(focusedOption.value.toLowerCase()) || 
            c.id.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        await interaction.respond(filtered.slice(0, 25).map(c => ({ name: `${c.name} (ID: ${c.id})`, value: c.id })));
    } else {
        let allProducts = [];
        for (const cat of categories) {
            for (const p of cat.products) {
                allProducts.push({ name: `[${cat.name}] ${p.name}`, value: p.id });
            }
        }
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(focusedOption.value.toLowerCase()) || 
            p.value.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        await interaction.respond(filtered.slice(0, 25));
    }
}

// ==========================================
// ⚡ SLASH COMMAND HANDLERS
// ==========================================
async function handleSlashCommands(interaction) {
    const commandName = interaction.commandName;

    if (commandName === 'ติดตั้งเมนูขายไอดี') {
        if (!checkAdmin(interaction)) return;
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const shopData = await createShopEmbed();
        await channel.send(shopData);
        await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``✅`` ติดตั้งเมนูสำเร็จ').setColor('#00ff00')] });
    }

    if (commandName === 'เพิ่มหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const id = interaction.options.getString('id');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji') || '📁';

        const categories = await loadCategories();
        if (categories.some(c => c.id === id)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` รหัสหมวดหมู่นี้ซ้ำในระบบ').setColor('#ff0000')], ephemeral: true });

        categories.push({ id, name, description, emoji, products: [] });
        await saveCategories(categories);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` เพิ่มหมวดหมู่สำเร็จ').setDescription(`ชื่อหมวดหมู่: ${name}`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'แก้ไขหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const catId = interaction.options.getString('category_id');
        const newName = interaction.options.getString('name');
        const newDesc = interaction.options.getString('description');
        const newEmoji = interaction.options.getString('emoji');

        let categories = await loadCategories();
        const category = categories.find(c => c.id === catId);
        if (!category) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบหมวดหมู่นี้').setColor('#ff0000')], ephemeral: true });

        if (newName) category.name = newName;
        if (newDesc) category.description = newDesc;
        if (newEmoji) category.emoji = newEmoji;

        await saveCategories(categories);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` แก้ไขหมวดหมู่สำเร็จ').setDescription(`หมวดหมู่: ${category.name}`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'ลบหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const catId = interaction.options.getString('category_id');
        let categories = await loadCategories();
        const index = categories.findIndex(c => c.id === catId);
        if (index === -1) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบหมวดหมู่นี้').setColor('#ff0000')], ephemeral: true });

        const removedCat = categories.splice(index, 1)[0];
        await saveCategories(categories);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` ลบหมวดหมู่สำเร็จ').setDescription(`ลบหมวดหมู่: ${removedCat.name}`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'เพิ่มสินค้าในหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const catId = interaction.options.getString('category_id');
        const productId = interaction.options.getString('product_id');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const price = interaction.options.getNumber('price');

        const categories = await loadCategories();
        const category = categories.find(c => c.id === catId);
        if (!category) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบหมวดหมู่นี้').setColor('#ff0000')], ephemeral: true });

        category.products.push({ id: productId, name, description, price });
        await saveCategories(categories);

        const stock = await getProductStock(productId);
        stock.price = price;
        await saveProductStock(productId, stock);

        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` เพิ่มสินค้าในหมวดหมู่สำเร็จ').setDescription(`สินค้า: ${name} (ราคา: ${price} บาท)`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'แก้ไขสินค้าในหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString('product');
        const newName = interaction.options.getString('name');
        const newDesc = interaction.options.getString('description');

        let categories = await loadCategories();
        let product = null;
        for (const cat of categories) {
            const p = cat.products.find(item => item.id === productId);
            if (p) { product = p; break; }
        }

        if (!product) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบสินค้านี้').setColor('#ff0000')], ephemeral: true });

        if (newName) product.name = newName;
        if (newDesc) product.description = newDesc;

        await saveCategories(categories);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` แก้ไขสินค้าสำเร็จ').setDescription(`สินค้า: ${product.name}`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'ลบสินค้าในหมวดหมู่') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString('product');

        let categories = await loadCategories();
        let found = false;
        let productName = '';
        for (const cat of categories) {
            const pIndex = cat.products.findIndex(p => p.id === productId);
            if (pIndex !== -1) {
                productName = cat.products[pIndex].name;
                cat.products.splice(pIndex, 1);
                found = true;
                break;
            }
        }

        if (!found) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบสินค้านี้').setColor('#ff0000')], ephemeral: true });
        await saveCategories(categories);

        try { await fs.unlink(`./products/stock/product${productId}.json`); } catch (e) {}

        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` ลบสินค้าสำเร็จ').setDescription(`ลบสินค้า: ${productName}`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'ตั้งราคาสินค้า' || commandName === 'แก้ไขราคาสินค้า') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString('product');
        const price = interaction.options.getNumber('price');

        const stock = await getProductStock(productId);
        stock.price = price;
        await saveProductStock(productId, stock);

        let categories = await loadCategories();
        let foundName = productId;
        for (const cat of categories) {
            const p = cat.products.find(item => item.id === productId);
            if (p) { p.price = price; foundName = p.name; break; }
        }
        await saveCategories(categories);

        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` ตั้ง/แก้ไขราคาสินค้าสำเร็จ').setDescription(`สินค้า: ${foundName}\nราคาใหม่: ${price} บาท`).setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'ลบราคาสินค้า') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString('product');

        const stock = await getProductStock(productId);
        stock.price = 0;
        await saveProductStock(productId, stock);

        let categories = await loadCategories();
        for (const cat of categories) {
            const p = cat.products.find(item => item.id === productId);
            if (p) { p.price = 0; break; }
        }
        await saveCategories(categories);

        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` รีเซ็ตราคาสินค้าเป็น 0 บาทสำเร็จ').setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'เพิ่มสต๊อกสินค้า' || commandName === 'แก้ไขสต๊อกสินค้า') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString(commandName === 'เพิ่มสต๊อกสินค้า' ? 'สินค้าที่จะเพิ่ม' : 'product');
        const file = interaction.options.getAttachment('อัพโหลดสินค้า');
        const chance = interaction.options.getNumber(commandName === 'เพิ่มสต๊อกสินค้า' ? 'ตั้งโอกาส' : 'chance');

        if (!file.name.endsWith('.txt')) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไฟล์ไม่ถูกต้อง').setDescription('กรุณาอัพโหลดไฟล์ .txt เท่านั้น').setColor('#ff0000')], ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        const response = await fetch(file.url);
        const text = await response.text();
        const items = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const stock = await getProductStock(productId);
        if (!stock.chances) stock.chances = {};
        const chanceKey = chance.toString();

        if (commandName === 'เพิ่มสต๊อกสินค้า') {
            if (!stock.chances[chanceKey]) stock.chances[chanceKey] = [];
            stock.chances[chanceKey].push(...items);
        } else {
            stock.chances[chanceKey] = items;
        }

        await saveProductStock(productId, stock);
        await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``✅`` จัดการสต๊อกสำเร็จ').setDescription(`รหัสสินค้า: ${productId}\nโอกาส: ${chance}%\nจำนวน: ${items.length} รายการ`).setColor('#00ff00')] });
    }

    if (commandName === 'ลบสต๊อกสินค้า') {
        if (!checkAdmin(interaction)) return;
        const productId = interaction.options.getString('product');
        const chance = interaction.options.getNumber('chance');

        const stock = await getProductStock(productId);
        if (chance !== null && chance !== undefined) {
            delete stock.chances?.[chance.toString()];
        } else {
            stock.chances = {};
        }
        await saveProductStock(productId, stock);

        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``✅`` ลบ/ล้างสต๊อกสินค้าสำเร็จ').setColor('#00ff00')], ephemeral: true });
    }

    if (commandName === 'จัดการยอดเงิน') {
        if (!checkAdmin(interaction)) return;
        const user = interaction.options.getUser('user');
        const action = interaction.options.getString('action');
        const amount = interaction.options.getNumber('amount');

        const userData = await topupSystem.loadUserData(user.id);
        let signedAmount = amount;

        if (action === 'add') {
            userData.point = (userData.point || 0) + amount;
            userData.pointall = (userData.pointall || 0) + amount;
        } else {
            userData.point = Math.max(0, (userData.point || 0) - amount);
            signedAmount = -amount;
        }
        await topupSystem.saveUserData(user.id, userData);

        // ส่ง Log การปรับยอดเงิน
        try {
            const logChannel = await client.channels.fetch(LOG_TOPUP_CHANNEL_ID);
            if (logChannel) await Logger.sendBalanceLog(interaction.user, user, signedAmount, userData.point, action, logChannel);
        } catch (logErr) {
            console.error('[LOG ERROR] ไม่สามารถส่ง Log จัดการยอดเงินได้:', logErr);
        }

        const embed = new EmbedBuilder()
            .setTitle('``✅`` จัดการยอดเงินสำเร็จ')
            .setDescription(`\`\`👤\`\` **ผู้ใช้:** ${user}\n\`\`💬\`\` **การกระทำ:** ${action === 'add' ? 'เพิ่ม' : 'ลด'}\n\`\`💰\`\` **จำนวน:** ${amount} บาท\n\`\`💳\`\` **ยอดใหม่:** ${userData.point.toFixed(2)} บาท`)
            .setColor('#00ff00');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// ==========================================
// 📋 SELECT MENU HANDLERS
// ==========================================
async function handleSelectMenus(interaction) {
    if (interaction.customId === 'shop_category_select') {
        const value = interaction.values[0];

        if (value === 'refresh_menu') {
            const shopData = await createShopEmbed();
            await interaction.update(shopData);
            return;
        }

        const catId = value.replace('category_', '');
        const categories = await loadCategories();
        const category = categories.find(c => c.id === catId);

        if (!category) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่พบหมวดหมู่นี้').setColor('#ff0000')], ephemeral: true });

        if (!category.products || category.products.length === 0) {
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('``⚠️`` หมวดหมู่นี้ยังไม่มีสินค้า').setDescription('กรุณารอแอดมินเพิ่มสินค้าในหมวดหมู่นี้ครับ').setColor('#ffa500')], ephemeral: true });
        }

        const productOptions = [];
        const seenProductIds = new Set();

        for (const p of category.products) {
            if (seenProductIds.has(p.id)) continue; 
            seenProductIds.add(p.id);

            const stock = await getProductStock(p.id);
            let totalStock = 0;
            if (stock.chances) {
                for (const chance in stock.chances) {
                    totalStock += stock.chances[chance].length;
                }
            }

            productOptions.push({
                label: p.name,
                description: `💰 ราคา ${stock.price} บาท | 📦 เหลือ ${totalStock} ชิ้น`,
                value: `product_${p.id}`,
                emoji: '🛒'
            });
        }

        const productSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_product_select')
            .setPlaceholder(`|︲🛒 เลือกสินค้าใน ${category.name}︲|`)
            .addOptions(productOptions);

        const catEmbed = new EmbedBuilder()
            .setTitle(`${category.emoji || '📁'} ${category.name}`)
            .setDescription(`\`\`\`${category.description || 'เลือกสินค้าที่คุณต้องการด้านล่างได้เลยครับ'}\`\`\``)
            .setImage(IMG_BANNER)
            .setColor('#0099ff');

        await interaction.reply({ embeds: [catEmbed], components: [new ActionRowBuilder().addComponents(productSelectMenu)], ephemeral: true });
    }

    if (interaction.customId === 'shop_product_select') {
        const productId = interaction.values[0].replace('product_', '');
        const categories = await loadCategories();
        let product = null;

        for (const cat of categories) {
            const found = cat.products.find(p => p.id === productId);
            if (found) { product = found; break; }
        }

        const stock = await getProductStock(productId);
        let totalStock = 0;
        if (stock.chances) {
            for (const chance in stock.chances) totalStock += stock.chances[chance].length;
        }

        const productEmbed = new EmbedBuilder()
            .setAuthor({ name: `🛒 | รายละเอียดสินค้า: ${product ? product.name : productId}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(
                `### 📦 **${product ? product.name : productId}**\n` +
                `\`\`\`ini\n` +
                `[ รายละเอียด ]: ${product ? product.description : '-'}\n` +
                `[ ราคา ]: ${stock.price} บาท\n` +
                `[ สินค้าคงเหลือ ]: ${totalStock} ชิ้น\n` +
                `[ ขายแล้ว ]: ${stock.sold || 0} ชิ้น\n` +
                `\`\`\``
            )
            .setImage(IMG_BANNER)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setColor('#0099ff');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_purchase:${productId}`)
                .setLabel('『 ยืนยันสั่งซื้อ 』')
                .setStyle(ButtonStyle.Success)
                .setEmoji('<a:gift_bunnystore:1407944669651927091>')
        );

        await interaction.reply({ embeds: [productEmbed], components: [buttons], ephemeral: true });
    }

    if (interaction.customId === 'topup_method_select') {
        const value = interaction.values[0];
        if (value === 'refresh_menu') {
            const embed = new EmbedBuilder().setTitle('``💰`` เติมเงินเข้าสู่ระบบ').setImage(IMG_BANNER).setColor('#0099ff');
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('topup_method_select')
                .setPlaceholder('|︲💰 เลือกวิธีการเติมเงิน︲|')
                .addOptions([
                    { label: 'เติมเงินด้วยซองอั่งเปา', description: 'เติมเงินผ่านลิงค์ซองอั่งเปา', value: 'truemoney_envelope', emoji: '🧧' },
                    { label: 'ล้างตัวเลือกใหม่', value: 'refresh_menu', emoji: '<:Ldelete:1387382890781999115>' }
                ]);

            await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
            return;
        }

        if (value === 'truemoney_envelope') {
            const modal = new ModalBuilder().setCustomId('topup_modal').setTitle('🧧 : เติมเงินด้วยซองอั่งเปา');
            const linkInput = new TextInputBuilder()
                .setCustomId('truemoney_link')
                .setLabel('🧧 : วางลิงค์ซองอั่งเปา')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://gift.truemoney.com/campaign/?v=...')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(linkInput));
            await interaction.showModal(modal);
        }
    }
}

// ==========================================
// 🔘 BUTTON HANDLERS
// ==========================================
async function handleButtons(interaction) {
    if (interaction.customId === 'back_to_main') {
        await interaction.update({ content: '🔄 ปิดเมนูนี้แล้ว', embeds: [], components: [] }).catch(() => {});
        return;
    }

    if (interaction.customId === 'refresh_product_menu' || interaction.customId === 'refresh_main_menu') {
        const shopData = await createShopEmbed();
        await interaction.update(shopData);
        return;
    }

    if (interaction.customId === 'topup_money') {
        const embed = new EmbedBuilder().setTitle('``💰`` เติมเงินเข้าสู่ระบบ').setImage(IMG_BANNER).setColor('#0099ff');
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('topup_method_select')
            .setPlaceholder('|︲💰 เลือกวิธีการเติมเงิน︲|')
            .addOptions([
                { label: 'เติมเงินด้วยซองอั่งเปา', description: 'เติมเงินผ่านลิงค์ซองอั่งเปา', value: 'truemoney_envelope', emoji: '🧧' },
                { label: 'ล้างตัวเลือกใหม่', value: 'refresh_menu', emoji: '<:Ldelete:1387382890781999115>' }
            ]);

        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }

    if (interaction.customId === 'check_balance') {
        const balance = await getUserMoney(interaction.user.id);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('``💳`` กำลังเช็คยอดเงิน...').setColor('#0099ff')], ephemeral: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username.toUpperCase()} - เช็คยอดเงิน`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`\`\`\`ยอดเงินคงเหลือ: ${balance.toFixed(2)} THB\`\`\``)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setImage(IMG_BANNER)
            .setColor('#0099ff');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId.startsWith('confirm_purchase:')) {
        const productId = interaction.customId.split(':')[1];
        await interaction.deferUpdate();

        const disabledButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('processing')
                .setLabel('กำลังซื้อสินค้า...')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:loading_circle:1426909233441407056>')
                .setDisabled(true)
        );

        await interaction.editReply({ components: [disabledButton] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const stock = await getProductStock(productId);
        const userBalance = await getUserMoney(interaction.user.id);

        let hasStock = Object.values(stock.chances || {}).some(items => items.length > 0);
        if (!hasStock) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``❌`` สินค้าหมดสต๊อก!').setDescription('```สินค้าหมดแล้ว กรุณารอแอดมินเติมสต๊อก```').setColor('#ff0000')], components: [] });
        }

        if (userBalance < stock.price) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``❌`` ยอดเงินไม่พอ').setDescription(`\`\`\`ยอดเงินของคุณ: ${userBalance.toFixed(2)} บาท\nราคาสินค้า: ${stock.price} บาท\`\`\``).setColor('#ff0000')], components: [] });
        }

        // ระบบสุ่มสินค้าตามเปอร์เซ็นต์
        let selectedItem = null;
        let selectedChance = null;
        const weightedChances = [];

        for (const chance in stock.chances) {
            if (stock.chances[chance].length > 0) {
                weightedChances.push({ chance: parseFloat(chance), key: chance, items: stock.chances[chance] });
            }
        }

        const totalWeight = weightedChances.reduce((sum, item) => sum + item.chance, 0);
        let random = Math.random() * totalWeight;

        for (const chanceGroup of weightedChances) {
            random -= chanceGroup.chance;
            if (random <= 0) {
                const randomIndex = Math.floor(Math.random() * chanceGroup.items.length);
                selectedItem = chanceGroup.items[randomIndex];
                selectedChance = chanceGroup.chance;
                stock.chances[chanceGroup.key].splice(randomIndex, 1);
                if (stock.chances[chanceGroup.key].length === 0) delete stock.chances[chanceGroup.key];
                break;
            }
        }

        stock.sold = (stock.sold || 0) + 1;
        await saveProductStock(productId, stock);

        const userData = await topupSystem.loadUserData(interaction.user.id);
        userData.point -= stock.price;
        await topupSystem.saveUserData(interaction.user.id, userData);

        const categories = await loadCategories();
        let productName = `สินค้า ID: ${productId}`;
        for (const cat of categories) {
            const found = cat.products.find(p => p.id === productId);
            if (found) { productName = found.name; break; }
        }

        await savePurchaseHistory(interaction.user.id, productName, selectedItem, stock.price);

        // ส่ง DM หาผู้ซื้อ + ส่ง Log
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('``✅`` คุณได้รับสินค้าแล้ว!')
                .setDescription(`\`\`📦\`\` **สินค้า:** **\`\`${productName}\`\`**\n\`\`💰\`\` **ราคา:** **\`\`${stock.price} บาท\`\`**\n\`\`❓\`\` **โอกาสที่ได้:** **\`\`${selectedChance} %\`\`**`)
                .addFields({ name: '``✅`` **สินค้าของคุณ:**', value: `\`\`\`${selectedItem}\`\`\`` })
                .setImage(IMG_BANNER)
                .setColor('#00ff00');
            await interaction.user.send({ embeds: [dmEmbed] });

            try {
                const logChannel = await client.channels.fetch(LOG_BUY_CHANNEL_ID);
                if (logChannel) await Logger.sendProductPurchaseLog(interaction.user, productName, stock.price, userData.point, logChannel, '🎮');
            } catch (logErr) {
                console.error('[LOG ERROR] ไม่สามารถส่ง Log ซื้อสินค้าได้:', logErr);
            }

            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``✅`` ทำรายการสำเร็จ!').setDescription('```สินค้าได้ถูกส่งไปยัง DM ของคุณแล้ว!```').setImage(IMG_BANNER).setColor('#00ff00')], components: [] });
        } catch (dmError) {
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('``❌`` ไม่สามารถส่ง DM ได้').setDescription('```กรุณาเปิด DM เพื่อรับสินค้า```').setColor('#ff0000')], components: [] });
        }
    }
}

// ==========================================
// 📝 MODAL SUBMIT HANDLERS
// ==========================================
async function handleModals(interaction) {
    if (interaction.customId === 'topup_modal') {
        const link = interaction.fields.getTextInputValue('truemoney_link');
        await interaction.deferReply({ ephemeral: true });
        const result = await topupSystem.processTopup(interaction.user.id, link);

        if (result.success) {
            const embed = new EmbedBuilder()
                .setTitle('``✅`` เติมเงินสำเร็จ!')
                .setDescription(`\`\`💰\`\` **จำนวนเงิน:** **\`\`${result.amount} บาท\`\`**\n\`\`💳\`\` **ยอดคงเหลือ:** **\`\`${result.userPoints.toFixed(2)} บาท\`\`**\n\`\`🧧\`\` **ชำระโดย:** \`${result.ownerName}\``)
                .setImage(IMG_BANNER)
                .setColor('#00ff00');
            await interaction.editReply({ embeds: [embed] });

            try {
                const logChannel = await client.channels.fetch(LOG_TOPUP_CHANNEL_ID);
                if (logChannel) await Logger.sendTopupLog(interaction.user, result.amount, result.userPoints, result.giftLink || link, logChannel, result.ownerName);
            } catch (logErr) {
                console.error('[LOG ERROR] ไม่สามารถส่ง Log เติมเงินได้:', logErr);
            }
        } else {
            const embed = new EmbedBuilder().setTitle('``❌`` เติมเงินไม่สำเร็จ').setDescription(`**\`\`\`${result.message}\`\`\`**`).setColor('#ff0000');
            await interaction.editReply({ embeds: [embed] });
        }
    }
}

// ==========================================
// 🔑 BOT LOGIN
// ==========================================
client.login(TOKEN);