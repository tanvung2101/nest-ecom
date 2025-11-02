CREATE UNIQUE INDEX "ProductTranslation_productId_languageId_unique"
ON "ProductTranslation" ("productId", "languageId");

CREATE UNIQUE INDEX "SKU_productId_value_unique"
ON "SKU" ("productId", "value");
