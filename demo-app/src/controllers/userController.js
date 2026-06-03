import { userService } from "../services/userService.js";

export async function getUser(req, res) {
  const user = await userService.findById(req.params.id);
  res.json(user);
}
