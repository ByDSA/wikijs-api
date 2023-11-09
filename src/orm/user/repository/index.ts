import connection from "orm/connection/Connection";
import User from "../User.entity";

const UserRepository = connection.then((c) => c.getRepository(User));

export default UserRepository;
