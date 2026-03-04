import { NextFunction, Request, Response } from "express";
import Campaign from "../models/campaign.model";
import { NOT_FOUND_ERROR } from "../utils/error";

export const createCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, subject, content, recipients } = req.body;
        const newCampaign = new Campaign({ user_id: req.user.sub, name, subject, content, recipients });
        const savedCampaign = await newCampaign.save();
        res.status(201).json({ message: "Campaign created successfully", data: savedCampaign });
    } catch (error) {
        next(error);
    }
};

export const getAllCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaigns = await Campaign.find({ user_id: req.user.sub }).sort({ createdAt: -1 });
        res.json({ message: "Campaigns retrieved successfully", data: campaigns });
    } catch (error) {
        next(error);
    }
};

export const getCampaignById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            throw new NOT_FOUND_ERROR('Campaign not found');
        }
        res.json({ message: "Campaign retrieved successfully", data: campaign });
    } catch (error) {
        next(error);
    }
};

export const deleteCampaignById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            throw new NOT_FOUND_ERROR('Campaign not found');
        }
        if (campaign.user_id.toString() !== req.user.sub) {
            throw new NOT_FOUND_ERROR('You do not have permission to delete this campaign');
        }
        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            throw new NOT_FOUND_ERROR('Campaign not found');
        }
        if (campaign.user_id.toString() !== req.user.sub) {
            throw new NOT_FOUND_ERROR('You do not have permission to update this campaign');
        }
        const { name, subject, content, recipients } = req.body;
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { name, subject, content, recipients },
            { new: true }
        );
        res.json({ message: "Campaign updated successfully", data: updatedCampaign });
    } catch (error) {
        next(error);
    }
};