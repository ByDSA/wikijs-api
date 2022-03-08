import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity( {
  name: "pageTree",
} )
export default class PageTree {
  @PrimaryColumn()
    id!: number;

  @Column( {
    type: "varchar",
    unique: true,
  } )
    path!: string;

  @Column()
    depth!: number;

  @Column()
    title!: string;

  @Column( {
    default: false,
  } )
    isPrivate!: boolean;

  @Column( {
    default: true,
  } )
    isFolder!: boolean;

  @Column( {
    type: "varchar",
    nullable: true,
    default: null,
  } )
    privateNS!: string;

  @Column( {
    type: "integer",
    nullable: true,
    name: "parent",
  } )
    parentId!: number | null;

  @Column( {
    type: "integer",
    nullable: true,
    name: "pageId",
  } )
    pageId!: number | null;

  @Column()
    localeCode!: string;

  @Column("jsonb", {
    array: true,
  } )
    ancestors!: number[];
}
