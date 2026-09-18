import { Request, Response } from "express";
import { storageRepository } from "../repositories/storage.repository";
import { ClusterManager } from "../services/cluster.service";
import { ErrorFactory } from "../utils/error.utils";
import { validateRequired } from "../validators/input.validator";
import { webhookService } from "../services/webhook.service";

const clusterManager = ClusterManager.getInstance();

export const shareController = {
  async createShare(req: Request, res: Response) {
    validateRequired(req.body, ["clientId"]);
    const { clientId, shareId: customShareId } = req.body;

    let shareId: string;

    if (customShareId) {
      const existing = await storageRepository.getShareSession(customShareId);
      if (existing) {
        res.status(409).json({ success: false, error: "Share ID already exists" });
        return;
      }
      shareId = customShareId;
    } else {
      shareId = `share-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    const shareSession = {
      shareId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      clients: [clientId],
      status: "active" as const,
    };

    await storageRepository.setShareSession(shareId, shareSession);

    const clientSession = await storageRepository.getClientSession(clientId);
    if (clientSession) {
      clientSession.shareId = shareId;
      await storageRepository.setClientSession(clientId, clientSession);

      try {
        await clusterManager.handleShareCreate(clientId, shareId, {
          clients: [clientId],
          createdAt: Date.now(),
        });
      } catch (error) {
        console.warn("Failed to publish share creation:", error);
      }
    }

    for (const cid of shareSession.clients) {
      await clusterManager.routeMessageToClient(cid, "connection-ready", {
        shareId,
        connectedClients: shareSession.clients.length,
        message: "Share session created - Waiting for others to join",
      });
    }

    res.json({ success: true, shareId, message: "Share session created" });
  },

  async joinShare(req: Request, res: Response) {
    validateRequired(req.body, ["shareId", "clientId"]);
    const { shareId, clientId } = req.body;

    const shareSession = await storageRepository.getShareSession(shareId);

    if (!shareSession) {
      res.status(404).json({ success: false, error: "Share session not found" });
      return;
    }

    if (shareSession.status === "inactive") {
      res.status(400).json({ success: false, error: "Share session is inactive" });
      return;
    }

    if (shareSession.clients.length >= 2) {
      res.status(409).json({ success: false, error: `Share session is full: ${shareId}` });
      return;
    }

    shareSession.clients.push(clientId);
    shareSession.lastActivity = Date.now();
    await storageRepository.setShareSession(shareId, shareSession);

    const clientSession = await storageRepository.getClientSession(clientId);
    if (clientSession) {
      clientSession.shareId = shareId;
      await storageRepository.setClientSession(clientId, clientSession);
    }

    for (const cid of shareSession.clients) {
      await clusterManager.routeMessageToClient(cid, "connection-ready", {
        shareId,
        connectedClients: shareSession.clients.length,
        message: "Connection ready - Ready to share files!",
      });

      await clusterManager.routeMessageToClient(
        cid,
        "client-joined-share",
        { clientId, shareId }
      );
    }

    await webhookService.triggerWebhook("share-joined", {
      shareId,
      clientId,
      connectedClients: shareSession.clients.length,
    });

    res.json({
      success: true,
      shareId,
      connectedClients: shareSession.clients.length,
      message: "Joined share session",
    });
  },
};
