import { createFlow, createProvider, MemoryDB, createBot } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import moment from 'moment';

const PORT = process.env.PORT ?? 3008;
const main = async () => {
    const adapterFlow = createFlow([]);
    const adapterProvider = createProvider(BaileysProvider);
    const adapterDB = new MemoryDB();
    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });
    const sendResponse = ({ res, statusCode, message, success = true }) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success, message }));
    };
    adapterProvider.server.post('/send', handleCtx(async (bot, req, res) => {
        const { phone, message, urlMedia } = req.body;
        const success = bot.provider.store.state.connection === "open";
        if (!success) {
            return sendResponse({ res: res, statusCode: 400, message: "CONNECTION_NOT_OPEN", success: false });
        }
        if (!phone || !message) {
            return sendResponse({
                res: res,
                statusCode: 400,
                message: "PHONE_AND_MESSAGE_ARE_REQUIRED",
                success: false
            });
        }
        console.log(`[ACTIVE_API] phone: ${phone} Date: ${moment().format('DD/MM/YYYY HH:mm')}`);
        const patronPhone = /^[0-9]{12}$/;
        if (patronPhone.test(phone)) {
            await bot.sendMessage(phone, message, { media: urlMedia ?? null });
            return sendResponse({ res: res, statusCode: 200, message: "MESSAGE_SENT" });
        }
        else {
            return sendResponse({ res: res, statusCode: 400, message: "PHONE_NUMBER_IS_INVALID", success: false });
        }
    }));
    adapterProvider.server.get('/require-scan', handleCtx(async (bot, _req, res) => {
        const success = bot.provider.store.state.connection === "open";
        return sendResponse({ res: res, statusCode: 200, message: "CONNECTION_STATUS", success: success });
    }));
    adapterProvider.server.get('/ping', handleCtx(async (_bot, _req, res) => {
        return sendResponse({ res: res, statusCode: 200, message: "PING_SUCCESS" });
    }));
    httpServer(+PORT);
};
main().then(() => console.log('Server running on port', PORT)).catch(console.error);
