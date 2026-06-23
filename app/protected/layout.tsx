import React from 'react';

// Auth and premium access are enforced by middleware.
// `modal` is the @modal parallel-route slot used by the intercepting post modal.
const layout = async ({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) => {
  return (
    <>
      {children}
      {modal}
    </>
  );
};

export default layout;
