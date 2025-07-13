"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "../../Button";
import EditorPreviewImage from "../../../../assets/product-image.png";
import EditorPreviewImageDark from "../../../../assets/product-image_dark.png";


export default function HowItWorks() {
  const router = useRouter();

  return (
     <section className="py-16 bg-gray-50 dark:bg-gray-800">
     <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-y-12 md:gap-x-12 items-center prose prose-gray dark:prose-invert">
       <div className="relative">
         {/* Light mode image */}
         <Image
           src={EditorPreviewImage}
           alt="Editor Preview"
           className="rounded-sm shadow-sm w-full block dark:hidden"
         />
         {/* Dark mode image */}
         <Image
           src={EditorPreviewImageDark}
           alt="Editor Preview"
           className="rounded-sm shadow-sm w-full hidden dark:block"
         />
       </div>

       <div>
         <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
           Write Freely, Securely, and Locally
         </h3>
         <p className="text-gray-700 dark:text-gray-300">
           Hermes Markdown lets you write without worrying about privacy
           breaches or losing control of your data. Perfect for
           professionals, students, and anyone who values simplicity and
           security.
         </p>
         <Button
         variant="primary"
         label="Try it out!"
         handler={() => router.push("/dashboard")}
       ></Button>
       </div>
     </div>
   </section>
  );
}
