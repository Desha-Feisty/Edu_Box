import type { Request, Response } from "express";
import User from "../models/user.js";

export type Role = "student" | "teacher";
export interface RequestBody {
    name: string;
    password: string;
    email: string;
    role: Role;
}
const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({});
        if (users.length === 0) {
            return res.status(200).json({ message: "No users found." });
        }
        return res.status(200).json({ num: users.length, users });
    } catch (error) {
        return res.status(500).json({ errMsg: "An error has occured" });
    }
};
const getUser = async (req: Request, res: Response) => {
    try {
        const { id: userID } = req.params;
        if (!userID) {
            return res.status(400).json({ errMsg: "user id not found" });
        }
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ errMsg: "user not found!" });
        }
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ errMsg: "An error has occured" });
    }
};
const createUser = async (req: Request<{}, {}, RequestBody>, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ errMsg: "Bad request!" });
        }
        const user = await User.create({ name, email, password, role });
        return res.status(201).json({ user });
    } catch (error) {
        return res.status(500).json({ errMsg: "An error has occured" });
    }
};
const updateUser = async (req: Request, res: Response) => {
    try {
        const { id: userID } = req.params;
        if (!userID) {
            return res.status(400).json({ errMsg: "bad request" });
        }
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ errMsg: "bad request" });
        }
        const user = await User.findByIdAndUpdate(
            userID,
            { email, password },
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ errMsg: "user not found" });
        }
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ errMsg: "An error has occured" });
    }
};
const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id: userID } = req.params;
        if (!userID) {
            return res.status(400).json({ errMsg: "bad request" });
        }
        const user = await User.findByIdAndDelete(userID);
        if (!user) {
            return res.status(404).json({ errMsg: "user not found" });
        }
        return res.status(200).json({ msg: "user deleted successfully" });
    } catch (error) {
        return res.status(500).json({ errMsg: "An error has occured" });
    }
};
