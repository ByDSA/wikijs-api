import { EntityRepository, Repository } from "typeorm";
import User from "../User.entity";

@EntityRepository(User)
export default class PageRepository extends Repository<User> {
}
