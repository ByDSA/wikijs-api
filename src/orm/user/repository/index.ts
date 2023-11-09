import connection from "../../connection/Connection";
import User from "../User.entity";

const UserRepository = connection.then((c) => c.getRepository(User));

export default UserRepository;
