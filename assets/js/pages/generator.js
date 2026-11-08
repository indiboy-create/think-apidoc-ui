(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function appSelectHtml(selected) {
    return (
      '<select class="layui-select" data-field="appKey">' +
      AD.appState.appList
        .map(function (app) {
          return '<option value="' + escape(app.appKey) + '"' +
            (app.appKey === selected ? ' selected' : '') + '>' +
            escape(app.fullTitle) + '</option>'
        })
        .join('') +
      '</select>'
    )
  }

  function flattenGroups(groups, level) {
    var rows = []
    ;(groups || []).forEach(function (group) {
      rows.push({ name: group.name, title: group.title, level: level || 0 })
      if (group.children && group.children.length) {
        rows = rows.concat(flattenGroups(group.children, (level || 0) + 1))
      }
    })
    return rows
  }

  function groupSelectHtml(appKey, selected) {
    var app = AD.appState.appObject[appKey]
    var groups = flattenGroups((app && app.groups) || [])
    var html =
      '<select class="layui-select" data-field="group">' +
      '<option value="">' + escape(AD.t('common.notGroup')) + '</option>'
    groups.forEach(function (group) {
      html +=
        '<option value="' + escape(group.name) + '"' +
        (group.name === selected ? ' selected' : '') + '>' +
        new Array(group.level + 1).join('　') + escape(group.title) + '</option>'
    })
    html += '</select>'
    return html
  }

  function optionsFromProps(props) {
    var options = (props && props.options) || []
    if (!Array.isArray(options)) return []
    return options.map(function (item) {
      if (item && typeof item === 'object') {
        return { label: item.label || item.title || item.value, value: item.value }
      }
      return { label: item, value: item }
    })
  }

  function formItemHtml(item, value) {
    var type = item.type || 'input'
    var field = item.field
    var props = item.props || {}
    var current = value
    if (current === undefined) current = item.default
    if (current === undefined) current = ''
    var attrs = ' data-field="' + escape(field) + '"'
    var control = ''
    if (type === 'select') {
      control =
        '<select class="layui-select"' + attrs + '>' +
        optionsFromProps(props)
          .map(function (option) {
            return '<option value="' + escape(option.value) + '"' +
              (String(option.value) === String(current) ? ' selected' : '') + '>' +
              escape(option.label) + '</option>'
          })
          .join('') +
        '</select>'
    } else if (type === 'number') {
      control =
        '<input type="number" class="layui-input"' + attrs + ' value="' + escape(current) + '">'
    } else if (type === 'checkbox') {
      control =
        '<input type="checkbox"' + attrs + (current ? ' checked' : '') + '>' +
        '<span class="ad-checkbox-label">' + escape(item.title) + '</span>'
    } else if (type === 'radioGroup') {
      var options = optionsFromProps(props)
      control = '<div class="ad-radio-group">' +
        options.map(function (option) {
          return '<label class="ad-radio"><input type="radio" name="' + escape(field) + '"' +
            attrs + ' value="' + escape(option.value) + '"' +
            (String(option.value) === String(current) ? ' checked' : '') + '> ' +
            escape(option.label) + '</label>'
        }).join('') + '</div>'
    } else {
      control =
        '<input type="text" class="layui-input"' + attrs + ' value="' + escape(current) + '">'
    }
    return (
      '<div class="ad-form-item' + (item.colspan ? ' ad-colspan-' + item.colspan : '') + '">' +
      '<label>' + escape(item.title) + (item.rules && item.rules.some(function (r) { return r.required })
        ? '<span class="ad-required">*</span>' : '') + '</label>' +
      control +
      '</div>'
    )
  }

  function optionsFromFiles(files) {
    return (files || []).filter(function (file) {
      return String(file.path || '').indexOf('.php') < 0
    })
  }

  function replacePath(path, appKey, formData) {
    var app = AD.appState.appObject[appKey]
    return utils.replaceStringByParam(utils.replaceAppConfigKeys(app, path || ''), formData)
  }

  function filesHtml(files, appKey, formData) {
    var list = optionsFromFiles(files)
    if (!list.length) return ''
    return (
      '<div class="ad-generator-files">' +
      list
        .map(function (file, index) {
          return (
            '<div class="ad-generator-file" data-file-index="' + escape(index) + '">' +
            '<label>' + escape(file.name) + '</label>' +
            '<input type="text" class="layui-input" data-file-value value="' +
            escape(file.value || '') + '" placeholder="' +
            escape(AD.t('common.pleaseInput') + file.name + AD.t('common.fileName')) + '">' +
            '<div class="ad-file-path">Path：<span>' +
            escape(replacePath(file.path, appKey, formData)) + '</span></div>' +
            '</div>'
          )
        })
        .join('') +
      '</div>'
    )
  }

  function tableColumnControl(column, value) {
    var type = column.type || 'input'
    var attrs =
      ' data-col="' + escape(column.field) + '"' +
      ' data-col-type="' + escape(type) + '"' +
      (column.options ? ' data-col-options="' + escape(JSON.stringify(column.options)) + '"' : '') +
      (column.mode ? ' data-col-mode="' + escape(column.mode) + '"' : '')
    if (type === 'select') {
      var options = column.options || []
      return '<select class="layui-select"' + attrs + '>' +
        options
          .map(function (option) {
            var optionValue = option && typeof option === 'object' ? option.value : option
            var optionLabel = option && typeof option === 'object' ? option.label || option.title || option.value : option
          return '<option value="' + escape(optionValue) + '"' +
              (String(optionValue) === String(value === undefined ? '' : value) ? ' selected' : '') + '>' +
              escape(optionLabel) + '</option>'
          })
          .join('') + '</select>'
    }
    if (type === 'checkbox') {
      return '<input type="checkbox"' + attrs + (value ? ' checked' : '') + '>'
    }
    return '<input type="text" class="layui-input"' + attrs + ' value="' +
      escape(value === undefined || value === null ? '' : value) + '">'
  }

  function tableRowHtml(option, fieldTypes, row) {
    var item = row || {}
    var columns = [
      { field: 'field', type: 'input' },
      { field: 'desc', type: 'input' },
      {
        field: 'type',
        type: 'select',
        options: (fieldTypes || []).map(function (type) {
          return { label: type, value: type }
        }),
      },
      { field: 'length', type: 'input' },
      { field: 'default', type: 'input' },
      { field: 'not_null', type: 'checkbox' },
      { field: 'main_key', type: 'checkbox' },
      { field: 'incremental', type: 'checkbox' },
    ].concat(option.columns || [])
    return (
      '<tr data-row>' +
      columns
        .map(function (column) {
          return '<td>' + tableColumnControl(column, item[column.field]) + '</td>'
        })
        .join('') +
      '<td class="ad-grid-center"><button type="button" class="ad-btn ad-btn-icon ad-btn-danger" ' +
      'data-action="delete-row"><i class="layui-icon layui-icon-delete"></i></button></td>' +
      '</tr>'
    )
  }

  function tableEditorHtml(option, index, fieldTypes, appKey, formData) {
    var defaults = option.default_fields || []
    var columns = [
      { title: AD.t('generator.table.field') },
      { title: AD.t('generator.table.desc') },
      { title: AD.t('generator.table.type') },
      { title: AD.t('generator.table.length') },
      { title: AD.t('generator.table.default') },
      { title: AD.t('generator.table.notNull') },
      { title: AD.t('generator.table.mainKey') },
      { title: AD.t('generator.table.autoAdd') },
    ].concat(
      (option.columns || []).map(function (column) {
        return { title: column.title }
      }),
    )
    return (
      '<div class="ad-generator-table" data-table-index="' + index + '">' +
      '<div class="ad-generator-table-head">' +
      '<b>' + escape(option.title) + '</b>' +
      '<span class="ad-file-path">' + escape(replacePath(option.path, appKey, formData)) + '\\</span>' +
      '<label>' + escape(AD.t('generator.model.name')) + '：</label>' +
      '<input type="text" class="layui-input" data-table-model value="">' +
      '<label>' + escape(AD.t('generator.table.name')) + '：</label>' +
      '<input type="text" class="layui-input" data-table-name value="">' +
      '<label>' + escape(AD.t('generator.table.comment')) + '：</label>' +
      '<input type="text" class="layui-input" data-table-comment value="">' +
      '</div>' +
      (option.desc ? '<div class="ad-alert">' + escape(option.desc) + '</div>' : '') +
      '<div class="ad-generator-table-alert"></div>' +
      '<table class="ad-grid ad-generator-grid"><thead><tr>' +
      columns
        .map(function (column) {
          return '<th>' + escape(column.title) + '</th>'
        })
        .join('') +
      '<th style="width:60px">' + escape(AD.t('common.action')) + '</th></tr></thead>' +
      '<tbody>' +
      (defaults.length
        ? defaults
            .map(function (row) {
              return tableRowHtml(option, fieldTypes, row)
            })
            .join('')
        : '') +
      '</tbody></table>' +
      '<button type="button" class="ad-btn ad-btn-sm ad-mt" data-action="add-row">' +
      '<i class="layui-icon layui-icon-add-1"></i> ' + escape(AD.t('globalParam.add')) + '</button>' +
      '</div>'
    )
  }

  function readForm(root) {
    var formData = {}
    root.querySelectorAll('[data-field]').forEach(function (el) {
      var field = el.getAttribute('data-field')
      if (el.type === 'checkbox') formData[field] = el.checked
      else if (el.type === 'radio') {
        if (el.checked) formData[field] = el.value
      } else formData[field] = el.value
    })
    return formData
  }

  function validateForm(items, formData) {
    for (var i = 0; i < (items || []).length; i++) {
      var item = items[i]
      if (item.rules && item.rules.length) {
        var message = utils.checkStringRules(formData[item.field], item.rules)
        if (message) return message
      }
    }
    return ''
  }

  function readFiles(root, files, appKey, formData) {
    var result = []
    ;(files || []).forEach(function (file) {
      var input = null
      if (String(file.path || '').indexOf('.php') < 0) {
        var list = optionsFromFiles(files)
        var index = list.indexOf(file)
        input = root.querySelector('[data-file-index="' + index + '"] [data-file-value]')
      }
      result.push({
        name: file.name,
        value: input ? input.value : '',
        path: replacePath(file.path, appKey, formData),
      })
    })
    return result
  }

  function readTables(root, tableItems, fieldTypes, appKey, formData) {
    var tables = []
    for (var i = 0; i < tableItems.length; i++) {
      var option = tableItems[i]
      var editor = root.querySelector('[data-table-index="' + i + '"]')
      if (!editor) continue
      var alertBox = editor.querySelector('.ad-generator-table-alert')
      alertBox.innerHTML = ''
      var modelName = editor.querySelector('[data-table-model]').value.trim()
      var tableName = editor.querySelector('[data-table-name]').value.trim()
      var comment = editor.querySelector('[data-table-comment]').value.trim()

      var modelRules = [{ required: true, message: AD.t('generator.model.name.placeholder') }].concat(
        option.model_rules || [],
      )
      var modelError = utils.checkStringRules(modelName, modelRules)
      if (modelError) {
        alertBox.innerHTML = '<div class="ad-alert ad-alert-error">' + escape(modelError) + '</div>'
        return null
      }
      var tableRules = [{ required: true, message: AD.t('generator.table.name.placeholder') }].concat(
        option.table_rules || [],
      )
      var tableError = utils.checkStringRules(tableName, tableRules)
      if (tableError) {
        alertBox.innerHTML = '<div class="ad-alert ad-alert-error">' + escape(tableError) + '</div>'
        return null
      }

      var rows = editor.querySelectorAll('tbody tr[data-row]')
      var datas = []
      var errorRows = []
      rows.forEach(function (row, rowIndex) {
        var data = {}
        row.querySelectorAll('[data-col]').forEach(function (control) {
          var col = control.getAttribute('data-col')
          var type = control.getAttribute('data-col-type')
          var value
          if (control.type === 'checkbox') value = control.checked
          else value = control.value
          if (type === 'select' && col !== 'type') {
            var optionsRaw = control.getAttribute('data-col-options')
            var options = []
            try {
              options = optionsRaw ? JSON.parse(optionsRaw) : []
            } catch (e) {
              options = []
            }
            if (control.getAttribute('data-col-mode') === 'multiple') value = value
            else {
              value = options.find(function (optionItem) {
                var optionValue = optionItem && typeof optionItem === 'object' ? optionItem.value : optionItem
                return String(optionValue) === String(value)
              })
            }
          }
          data[col] = value
        })
        if (!(data.field && data.type)) errorRows.push(rowIndex + 1)
        datas.push(data)
      })
      if (errorRows.length) {
        alertBox.innerHTML =
          '<div class="ad-alert ad-alert-error">' +
          escape(AD.t('generator.table.row.error', { rows: errorRows.join(',') })) +
          '</div>'
        return null
      }

      tables.push({
        table_name: tableName,
        model_name: modelName,
        table_comment: comment,
        namespace: option.namespace ? replacePath(option.namespace, appKey, formData) : '',
        model_path: option.path ? replacePath(option.path, appKey, formData) : '',
        template: option.template || '',
        datas: datas,
      })
    }
    return tables
  }

  function open(index, onSuccess) {
    var state = AD.appState
    var generator = (state.serverConfig.generator || [])[index]
    if (!generator) {
      layui.layer.msg(AD.t('common.error'), { icon: 2 })
      return
    }
    var formItems = [
      { title: AD.t('generator.apps.title'), field: 'appKey', type: 'app-select' },
      { title: AD.t('generator.group.title'), field: 'group', type: 'group-select' },
    ].concat((generator.form && generator.form.items) || [])
    var tableItems = (generator.table && generator.table.items) || []
    var fieldTypes = (generator.table && generator.table.field_types) || []
    var formData = { appKey: state.appKey, group: '' }
    formItems.forEach(function (item) {
      if (item.default !== undefined) formData[item.field] = item.default
    })

    var formHtml = formItems
      .map(function (item) {
        if (item.type === 'app-select') {
          return (
            '<div class="ad-form-item"><label>' + escape(item.title) + '</label>' +
            appSelectHtml(formData.appKey) + '</div>'
          )
        }
        if (item.type === 'group-select') {
          return (
            '<div class="ad-form-item"><label>' + escape(item.title) + '</label>' +
            groupSelectHtml(formData.appKey, formData.group) + '</div>'
          )
        }
        return formItemHtml(item, formData[item.field])
      })
      .join('')

    var html =
      '<div class="ad-generator">' +
      '<div class="ad-generator-forms">' + formHtml + '</div>' +
      '<div class="ad-generator-files-wrap"></div>' +
      '<div class="ad-generator-tables"></div>' +
      '</div>'

    layui.use(['layer'], function () {
      var layer = layui.layer
      var indexLayer = layer.open({
        type: 1,
        title: AD.t('generator.title') + ' - ' + (generator.title || ''),
        area: ['90%', '85%'],
        shadeClose: false,
        content: html,
        btn: [AD.t('common.ok'), AD.t('common.cancel')],
        success: function (layerEl) {
          var root = layerEl.find('.ad-generator')[0]
          function renderEditors() {
            root.querySelector('.ad-generator-files-wrap').innerHTML = filesHtml(
              generator.files,
              formData.appKey,
              formData,
            )
            root.querySelector('.ad-generator-tables').innerHTML = tableItems
              .map(function (option, tableIndex) {
                return tableEditorHtml(option, tableIndex, fieldTypes, formData.appKey, formData)
              })
              .join('')
          }
          renderEditors()

          root.addEventListener('change', function (event) {
            if (event.target.getAttribute('data-field') === 'appKey') {
              formData.appKey = event.target.value
              var groupBox = root.querySelector('[data-field="group"]')
              if (groupBox) {
                var groupWrap = groupBox.parentNode
                groupWrap.innerHTML =
                  '<label>' + escape(AD.t('generator.group.title')) + '</label>' +
                  groupSelectHtml(formData.appKey, '')
                formData.group = ''
              }
              root.querySelector('.ad-generator-table-head .ad-file-path')
              renderEditors()
            }
          })

          root.addEventListener('input', function (event) {
            var tableEditor = event.target.closest('[data-table-index]')
            if (tableEditor && event.target.hasAttribute('data-table-model')) {
              var tableName = tableEditor.querySelector('[data-table-name]')
              tableName.value = utils.camelToUnderline(event.target.value)
            }
          })

          root.addEventListener('click', function (event) {
            var addRow = event.target.closest('[data-action="add-row"]')
            if (addRow) {
              var editor = addRow.closest('[data-table-index]')
              var tableIndex = Number(editor.getAttribute('data-table-index'))
              var option = tableItems[tableIndex]
              var tbody = editor.querySelector('tbody')
              var defaults = option.default_values || {}
              var row = tableRowHtml(option, fieldTypes, defaults)
              tbody.insertAdjacentHTML('beforeend', row)
              return
            }
            var deleteRow = event.target.closest('[data-action="delete-row"]')
            if (deleteRow) {
              var tr = deleteRow.closest('tr')
              tr.parentNode.removeChild(tr)
            }
          })
        },
        yes: function (indexLayerValue) {
          var layerBox = document.getElementById('layui-layer' + indexLayerValue)
          var root = layerBox.querySelector('.ad-generator')
          formData = readForm(root)
          var formError = validateForm(formItems, formData)
          if (formError) {
            layer.msg(formError, { icon: 2 })
            return
          }
          var fileData = readFiles(root, generator.files, formData.appKey, formData)
          var tablesData = readTables(root, tableItems, fieldTypes, formData.appKey, formData)
          if (tablesData === null) {
            layer.msg(AD.t('generator.table.row.error', { rows: '' }), { icon: 2 })
            return
          }
          layer.load(2, { shade: 0.1 })
          AD.api
            .generator({
              index: index,
              form: formData,
              files: fileData,
              tables: tablesData,
            })
            .then(function () {
              layer.closeAll('loading')
              layer.msg(AD.t('generator.submitSuccess'), { icon: 1 })
              layer.close(indexLayerValue)
              if (typeof onSuccess === 'function') onSuccess()
            })
            .catch(function (error) {
              layer.closeAll('loading')
              layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
            })
        },
      })
    })
  }

  AD.pages = AD.pages || {}
  AD.pages.generator = { open: open }
})()