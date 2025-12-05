import { bucket } from "./bucket";
import { fileApi as file } from "./file";
import { msg } from "./msg";
import { packages } from "./package";
import {  user } from "./user";

export const api = {
    user,
    bucket,
    file,
    msg,
    packages,
}