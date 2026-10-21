const Label: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & { isRequired?: boolean }
> = ({ isRequired = false, ...props }) => {
  return (
    <label
      {...props}
      className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1"
    >
      {" "}
      {props.children}{" "}
      {isRequired && <span className="text-red-500">*</span>}{" "}
    </label>
  );
};

export default Label;
