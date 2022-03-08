import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity( {
  name: "users",
} )
export default class User {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    email!: string;

  @Column()
    name!: string;

  @Column( {
    type: "integer",
    nullable: true,
  } )
    providerId!: number | null;

  @Column()
    password!: string;

  @Column()
    tfaIsActive!: boolean;

  @Column( {
    type: "varchar",
    nullable: true,
  } )
    tfaSecret!: string | null;

  @Column()
    jobTitle!: string;

  @Column()
    location!: string;

  @Column( {
    type: "varchar",
    nullable: true,
  } )
    pictureUrl!: string | null;

  @Column()
    timezone!: string;

  @Column()
    isSystem!: boolean;

  @Column()
    isActive!: boolean;

  @Column()
    isVerified!: boolean;

  @Column()
    mustChangePwd!: boolean;

  @Column()
    createdAt!: Date;

  @Column()
    updatedAt!: Date;

  @Column()
    providerKey!: string;

  @Column()
    localeCode!: string;

  @Column()
    defaultEditor!: string;

  @Column( {
    type: "date",
    nullable: true,
  } )
    lastLoginAt!: Date | null;

  @Column()
    dateFormat!: string;

  @Column()
    appearence!: string;
}
