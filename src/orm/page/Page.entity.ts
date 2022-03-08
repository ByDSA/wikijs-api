import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import User from "../user/User.entity";

@Entity( {
  name: "pages",
} )
export default class Page {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    path!: string;

  @Column()
    hash!: string;

  @Column()
    title!: string;

  @Column()
    description!: string;

  @Column()
    isPrivate!: boolean;

  @Column()
    isPublished!: boolean;

  @Column( {
    type: "varchar",
    nullable: true,
  } )
    privateNS!: string | null;

  @Column( {
    type: "date",
    nullable: true,
  } )
    publishStartDate!: Date | null;

  @Column( {
    type: "date",
    nullable: true,
  } )
    publishEndDate!: Date | null;

  @Column()
    content!: string;

  @Column()
    render!: string;

  @Column( {
    type: "json",
    array: true,
  } )
    toc: any;

  @Column()
    contentType!: string;

  @Column()
    createdAt!: Date;

  @Column()
    updatedAt!: Date;

  @Column()
    editorKey!: string;

  @Column()
    localeCode!: string;

    @OneToOne(() => User)
  @JoinColumn( {
    name: "authorId",
  } )
      author!: User;

    @OneToOne(() => User)
  @JoinColumn( {
    name: "creatorId",
  } )
      creator!: User;

  @Column( {
    type: "json",
    array: true,
  } )
    extra: any;
}
