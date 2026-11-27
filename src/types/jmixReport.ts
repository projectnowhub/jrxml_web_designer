// A Jmix report as the report server stores it: the JSON that Jmix's
// ReportsSerialization (Gson) writes into REPORT_REPORT.XML. Every value is a
// string, enums are their ids (enums/jmixReport.ts), and every object carries
// its metaClass and id; other objects are referred to by { metaClass, id }.
// Field names as in the jmix-reports 3.0.1 entities; only those the designer
// writes are listed. The template file itself (the JRXML) is REPORT_TEMPLATE.CONTENT.

export interface JmixEntityRef {
  metaClass: string;
  id: string;
}

export interface JmixReportGroup extends JmixEntityRef {
  code: string;
  title: string;
}

export interface JmixInputParameter extends JmixEntityRef {
  alias: string;
  name: string;
  type: string;
  entityMetaClass?: string;
  required: string;
  defaultValue?: string;
  defaultDateIsCurrent?: string;
  position: string;
}

export interface JmixDataSet extends JmixEntityRef {
  name: string;
  type: string;
  text: string;
  // The band's request (types/reportBands.ts), read by the band loader
  jsonSourceText?: string;
}

export interface JmixBandDefinition extends JmixEntityRef {
  name: string;
  orientation: string;
  position: string;
  parentBandDefinition?: JmixEntityRef;
  childrenBandDefinitions?: JmixEntityRef[];
  dataSets?: JmixDataSet[];
}

export interface JmixReportTemplate extends JmixEntityRef {
  code: string;
  name: string;
  reportOutputType: string;
  custom: string;
  customDefinedBy: string;
  customDefinition: string;
}

export interface JmixReportStructure extends JmixEntityRef {
  name: string;
  code: string;
  restAccess: string;
  group: JmixReportGroup;
  inputParameters: JmixInputParameter[];
  bands: JmixBandDefinition[];
  templates: JmixReportTemplate[];
}
