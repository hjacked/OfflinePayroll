import React, { useEffect, useState } from "react";

export default function AdminPortal() {

  const [status, setStatus] = useState("Loading...");

  useEffect(() => {

    console.log("API:", window.api);

    if (!window.api) {
      setStatus("API NOT FOUND");
      return;
    }

    window.api.employee.list()
      .then((result:any)=>{

        console.log(result);

        setStatus(
          "Employees loaded: " + result.total
        );

      })
      .catch((err:any)=>{

        console.error(err);
        setStatus("API ERROR");

      });

  }, []);


  return (
    <div style={{padding:40}}>
      <h1>Payroll Offline</h1>
      <h2>Admin Portal</h2>
      <p>{status}</p>
    </div>
  );
}