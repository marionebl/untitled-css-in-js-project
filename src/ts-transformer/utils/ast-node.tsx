import * as ts from 'typescript';
import { name as packageName } from '../../../package.json';

const LOCAL_DEVELOPMENT_MODULE = '../src';

export const getExpressionText = (node: ts.Expression) => {
  if (!ts.isStringLiteral(node)) {
    throw createNodeError('expression isnt a string literal', node);
  }

  return (node as ts.StringLiteral).text;
};

export const getIdentifierText = (
  node: ts.PropertyName | ts.BindingName | ts.Expression
): string => {
  return ((node as ts.Identifier).escapedText as string) || (node as ts.Identifier).text;
};

export const getAssignmentIdentifier = (
  node: ts.ShorthandPropertyAssignment | ts.PropertyAssignment
): ts.Identifier => {
  return 'initializer' in node ? node.initializer : (node.name as any);
};

export const getAssignmentIdentifierText = (
  node: ts.ShorthandPropertyAssignment | ts.PropertyAssignment
) => {
  return getIdentifierText(getAssignmentIdentifier(node));
};

export const getJsxNodeAttributes = (
  node: ts.JsxElement | ts.JsxSelfClosingElement
): ts.JsxAttributes => {
  if ('attributes' in node) {
    return node.attributes;
  }

  return node.openingElement.attributes;
};

export const getJsxNodeAttributesValue = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  propertyName: string
) => {
  const attribute = getJsxNodeAttributes(node).properties.find(
    prop => ts.isJsxAttribute(prop) && prop.name.escapedText === propertyName
  ) as ts.JsxAttribute | undefined;

  return attribute?.initializer ? attribute.initializer : undefined;
};

export const isPackageModuleImport = (statement: ts.Node, namedImport: string): boolean => {
  if (
    !ts.isImportDeclaration(statement) ||
    !ts.isStringLiteral(statement.moduleSpecifier) ||
    !statement.importClause?.namedBindings ||
    !ts.isNamedImports(statement.importClause?.namedBindings)
  ) {
    return false;
  }

  const isLibraryImport =
    statement.moduleSpecifier.text === packageName ||
    statement.moduleSpecifier.text === LOCAL_DEVELOPMENT_MODULE;

  if (!isLibraryImport) {
    return false;
  }

  const isStyledImported =
    statement.importClause.namedBindings.elements.filter(
      specifier => specifier.name.escapedText === namedImport
    ).length > 0;

  return isStyledImported;
};

export const createNodeError = (message: string, node: ts.Node) => {
  // Throws a string so we don't get a stack trace.
  throw `${packageName} => ${message}

${node.getText()}
`;
};
