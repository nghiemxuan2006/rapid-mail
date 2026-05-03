import express from 'express';
import { getProfile, login, refresh, connectGmail, connectOutlook, removeConnectedAccount, activateConnectedAccount } from '../controllers/auth.controller';
import { validateRequestQuery } from '../middleware/validation';
import { loginQuerySchema } from '../schema/auth.schema';
import verifyToken from '../middleware/verify-token';

const router = express.Router();

router.get('/login', validateRequestQuery(loginQuerySchema), login);
router.post('/refresh-token', refresh);
router.get('/profile', verifyToken, getProfile);
router.get('/connect/gmail', verifyToken, connectGmail);
router.post('/connect/outlook', verifyToken, connectOutlook);
router.delete('/connected-accounts/:accountId', verifyToken, removeConnectedAccount);
router.put('/connected-accounts/:accountId/activate', verifyToken, activateConnectedAccount);

export default router;
