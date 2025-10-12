import { Metadata } from "next";
import TeachersClient from "./TeachersClient";

export const metadata: Metadata = {
  title: "Kelola Guru | Generus Mandiri",
  description: "Kelola data guru dan kelas",
};

export default function TeachersPage() {
  return <TeachersClient />;
}
