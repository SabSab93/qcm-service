import { Router } from "express";
import { prisma } from "../index";

export const qcmRouter = Router();

qcmRouter.get("/", async (req, res) => {
  try {
    const qcms = await prisma.qcm.findMany({
      include: {
        questions: true,
      },
    });

    res.status(200).json(qcms);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

qcmRouter.post("/", async (req, res) => {
  try {
    const { name, questions } = req.body.data;

    if (!name || !questions) {
      return res.status(400).json({
        message: "Name and questions are required",
      });
    }

    if (questions.length < 3 || questions.length > 5) {
      return res.status(400).json({
        message: "Un QCM doit avoir entre 3 et 5 questions",
      });
    }

    for (const question of questions) {
      const validAnswers = question.propositions.filter((proposition: any) => {
        return proposition.isValid === true;
      });

      if (validAnswers.length < 1 || validAnswers.length > 2) {
        return res.status(400).json({
          message: "Chaque question doit avoir entre 1 et 2 réponses valides",
        });
      }
    }

    const qcm = await prisma.qcm.create({
      data: {
        name,
      },
    });

    for (const question of questions) {
      const createdQuestion = await prisma.question.create({
        data: {
          description: question.description,
          qcmId: qcm.id,
        },
      });

      for (const proposition of question.propositions) {
        await prisma.proposition.create({
          data: {
            description: proposition.description,
            isValid: proposition.isValid,
            questionId: createdQuestion.id,
          },
        });
      }
    }

    res.status(201).json({
      message: "QCM créé",
      qcm,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

qcmRouter.get("/:id", async (req, res) => {
  try {
    const qcmId = parseInt(String(req.params.id));

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid qcm ID" });
    }

    const qcm = await prisma.qcm.findUnique({
      where: { id: qcmId },
    include: {
        questions: true,
      },
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM not found" });
    }

    res.json(qcm);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


qcmRouter.put("/:id", async (req, res) => {
  try {
    const qcmId = parseInt(String(req.params.id));

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid QCM ID" });
    }

    const qcm = await prisma.qcm.findUnique({
      where: { id: qcmId },
    include: {
        questions: true,
      },
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM not found" });
    }

    const { name } = req.body.data;

    if (!name ) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const updatedQcm = await prisma.qcm.update({
      where: { id: qcmId },
      data: {
        name,
      },
    });

    res.status(200).json(updatedQcm);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

qcmRouter.delete("/:id", async (req, res) => {
  try {
    const qcmId = parseInt(String(req.params.id));

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid QCM ID" });
    }

    const qcm = await prisma.qcm.findUnique({
      where: { id: qcmId },
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM not found" });
    }

    await prisma.qcm.delete({
      where: { id: qcmId },
    });

    res.status(204).json({ message: "QCM deleted" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});



qcmRouter.get("/:id/result", async (req, res) => {
  try {
    const qcmId = parseInt(String(req.params.id));
    const userId = (req as any).user.id;
    console.log("User ID for result retrieval:", userId);

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid QCM ID" });
    }

    const responses = await prisma.response.findMany({
      where: {
        proposition: {
          question: {
            qcmId: qcmId,
          },
        },
      },
      include: {
        proposition: true,
      },
    });

    const total = responses.length;

    const score = responses.filter((response) => {
      return response.isChecked === response.proposition.isValid;
    }).length;

    res.status(200).json({
      qcmId,
      score,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});



qcmRouter.get("/:id/question", async (req, res) => {
  try {
    const qcmId = parseInt(String(req.params.id));
    const userId = (req as any).user.id;

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid QCM ID" });
    }


    const qcm = await prisma.qcm.findUnique({
      where: { id: qcmId },
      include: {
        questions: {
          include: {
            propositions: true,
          },
        },
      },
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM not found" });
    }

    const responses = await prisma.response.findMany({
      where: {
        userId,
        proposition:{
          question:{
            qcmId,
          }
        }
      },
    });

    for (const question of qcm.questions) {
      let alreadyAnswered = false;

      for (const proposition of question.propositions) {
        for (const response of responses) {
          if (response.propositionId === proposition.id) {
            alreadyAnswered = true;
          }
        }
      }

      if (!alreadyAnswered) {
        return res.status(200).json(question);
      }
    }

    res.status(200).json({
      message: "Toutes les questions ont déjà été répondues",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});




qcmRouter.post("/:id/response", async (req, res) => { 
  try {
    const qcmId = parseInt(String(req.params.id));
    const userId = (req as any).user.id;

    if (isNaN(qcmId)) {
      return res.status(400).json({ message: "Invalid QCM ID" });
    }

    const { propositionId, isChecked } = req.body.data;

    if (!propositionId) {
      return res.status(400).json({ message: "Proposition ID is required" });
    }
    
    const response = await prisma.response.create({
      data: {
        propositionId,
        userId: userId,
        isChecked,
      },
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});