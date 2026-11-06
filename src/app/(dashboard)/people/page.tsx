import type { Metadata } from "next";
import { PeopleManager } from "@/components/people/people-manager";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return <PeopleManager />;
}
