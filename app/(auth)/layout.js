const AuthLayout = ({ children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-auto">
      {children}
    </div>
  );
};

export default AuthLayout;