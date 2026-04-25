import { Request, Response, NextFunction } from 'express';
import { loginWithGoogle, refreshAppToken, getUserProfile, connectGmailAccount, connectOutlookAccount, disconnectAccount, setActiveAccount } from '../services/auth.service';
import { BAD_REQUEST_ERROR } from '../utils/error';
import { extractToken } from '../utils/token';
import { LoginQuery } from '../schema/auth.schema';

const login = async (req: Request<{}, {}, {}, LoginQuery>, res: Response, next: NextFunction) => {
  try {
    const authorizeCode = req.query.authorize_code;

    if (!authorizeCode || typeof authorizeCode !== 'string') {
      throw new BAD_REQUEST_ERROR('authorize_code param is required');
    }

    const result = await loginWithGoogle(authorizeCode);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = extractToken(req.header('Authorization'));

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BAD_REQUEST_ERROR('refresh_token is required');
    }

    const tokens = await refreshAppToken(refreshToken);

    res.json(tokens);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const profile = await getUserProfile(user.sub);

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const connectGmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authorize_code } = req.query as { authorize_code?: string };
    if (!authorize_code) throw new BAD_REQUEST_ERROR('authorize_code is required');

    const result = await connectGmailAccount(req.user.sub, authorize_code);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const connectOutlook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authorize_code } = req.body as { authorize_code?: string };
    if (!authorize_code) throw new BAD_REQUEST_ERROR('authorize_code is required');

    const result = await connectOutlookAccount(req.user.sub, authorize_code);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const removeConnectedAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    if (!accountId) throw new BAD_REQUEST_ERROR('accountId is required');

    const result = await disconnectAccount(req.user.sub, accountId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const activateConnectedAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    if (!accountId) throw new BAD_REQUEST_ERROR('accountId is required');

    const result = await setActiveAccount(req.user.sub, accountId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export { login, refresh, getProfile, connectGmail, connectOutlook, removeConnectedAccount, activateConnectedAccount };
